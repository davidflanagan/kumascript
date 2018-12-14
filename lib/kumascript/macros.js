// ## KumaScript macro processing
//
// This is where the magic happens, with regards to finding, inventorying, and
// executing macros in content.

/*jshint node: true, expr: false, boss: true */

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const ks_utils = require('./utils.js');
const ks_errors = require('./errors.js');
const ks_api = require('./api.js');

ejs.fileLoader = function(filename) {
    console.log("Loading file", filename);
    let content = fs.readFileSync(filename, 'utf8');
    console.log("got text", content.length);
    return content;
}



// Load the document parser, from pre-generated JS if available or on the fly
// from the grammar source.
let ks_parser;
try {
    // NOTE: For production, ensure the parser has been generated.
    // `./node_modules/.bin/pegjs lib/kumascript/parser.pegjs`
    ks_parser = require('./parser.js');
} catch (e) {
    // For dev only, generate parser from source on the fly
    let PEG = require("pegjs"),
        fs = require("fs"),
        ks_parser_fn = __dirname + '/parser.pegjs',
        ks_parser_src = fs.readFileSync(ks_parser_fn, 'utf8');
    ks_parser = PEG.buildParser(ks_parser_src);
}


// ### MacroProcessor class
class MacroProcessor {

    constructor(macroDir) {
        this.macroDir = macroDir;
        this.templateNameToFilename = new Map();

        // Find all the macros in the macros dir and build a map
        // from macro name to filename
        const dirs = [ macroDir ];
        const duplicates = new Map();

        // Walk the directory tree under the specified root directory.
        while (dirs.length > 0) {
            let dir = dirs.shift();
            fs.readdirSync(dir).forEach(fn => {
                // If the given filename is a directory, push it onto
                // the queue, otherwise consider it a template.
                let fp = path.join(dir, fn);
                if (fs.statSync(fp).isDirectory()) {
                    dirs.push(fp);
                } else if (fp.endsWith('.js') || fp.endsWith('.ejs')) {
                    var name = path.parse(fn).name.toLowerCase();
                    if (this.templateNameToFilename.has(name)) {
                        // Keep track of all duplicates and throw error later.
                        if (!duplicates.has(name)) {
                            duplicates.set(
                                name,
                                [this.templateNameToFilename.get(name)]
                            );
                        }
                        duplicates.get(name).push(fp);
                    } else {
                        this.templateNameToFilename.set(name, fp);
                    }
                }
            });
        }

        if (this.templateNameToFilename.size === 0) {
            // Let's throw an error if no macros could be discovered, since
            // for now this is the only time we check and this loader is
            // useless if there are no macros.
            throw new Error(
                `no macros could be found in "${macroDir}"`
            );
        }

        if (duplicates.size !== 0) {
            // Duplicate template names
            var msg = "Duplicate macros:";
            for(let [name, files] of duplicates) {
                msg += "\n" + name + ": " + files.join(", ");
            }
            throw new Error(msg);
        }
   }

    // #### Process macros in content
    async process(src, ctx) {

        // Attempt to parse the document
        var tokens = [];
        try { tokens = ks_parser.parse(src); }
        catch (e) {
            throw new ks_errors.DocumentParsingError({ error: e, src: src });
        }

        // Loop through the tokens, creating a promise for each macro
        // TODO: for duplicate macros, only evaluate them once.
        let promises = []
        let errors = []
        tokens.forEach(token => {
            if (token.type === 'MACRO') {
                const context = new ks_api.APIContext({
                    arguments: token.args,
                    errors: errors,
                    ctx: ctx
                });
                let filename = this.templateNameToFilename.get(token.name);
                let promise = ejs.render(null, context, {
                    async: true,
                    cache: true,
                    filename: filename
                });
                // We need to know where to find the results of this macro
                // call, so remember its index in the promises array
                token.promiseIndex = promises.length;
                promises.push(promise);
            }
        });

        // Now wait for all the promises to finish
        let results = await Promise.all(promises);

        // And assemble the output document
        let output = tokens.map(token => {
            if (token.type === 'TEXT') {
                return token.chars;
            }
            else if (token.type === 'MACRO') {
                return results[token.promiseIndex];
            }
        }).join('');

        return output;
    }

    // // #### Produce a unique hash for macro
    // // A macro's unique hash encompasses the template name and the arguments
    // hashTokenArgs(token) {
    //     // Hash the macro name and args, to identify unique calls.
    //     var hash = crypto.createHash('md5').update(token.name);
    //     if (token.args.length > 0) {
    //         // Update the hash with arguments, if any...
    //         if (_.isObject(token.args[0])) {
    //             // JSON-style args, so stringify the object.
    //             hash.update(JSON.stringify(token.args));
    //         } else {
    //             // Otherwise, this is a simple string list.
    //             hash.update(token.args.join(','));
    //         }
    //     }
    //     return hash.digest('hex');
    // }
}

// ### Exported public API
module.exports = {
    MacroProcessor: MacroProcessor
};
