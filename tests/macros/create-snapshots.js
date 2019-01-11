/**
 * @prettier
 */
/* eslint-disable no-console */

const fs = require('fs');
const Templates = require('../../src/templates.js');
const snapshot = require('./snapshot.js');

// Get a list of the existing tests in this directoy
let macrosWithTests = new Set(
    fs
        .readdirSync(__dirname)
        .filter(fn => fn.endsWith('.test.js'))
        .map(fn => fn.slice(0, -8).toLowerCase())
);

// Get a list of all macros, and a list of macros without tests
let templates = new Templates(__dirname + '/../../macros/');
let allMacros = [...templates.getTemplateMap().keys()];
let macrosWithoutTests = allMacros.filter(n => !macrosWithTests.has(n));
macrosWithoutTests.sort();

const INPUTS = [[], ['a1', 'a2', 'a3', 'a4']];

async function createSnapshots() {
    let macroSnapshots = {};

    for (let macroname of macrosWithoutTests) {
        // Two macros produce random output and can't be tested this way
        // So just skip over them.
        if (macroname === 'learnbox' || macroname === 'tenthcampaignquote') {
            continue;
        }

        console.log(macroname);
        let snapshots = [];
        macroSnapshots[macroname] = snapshots;
        let lastOutput = null;

        for (let input of INPUTS) {
            try {
                let output = await snapshot(macroname, input);
                // If the output doesn't change with the input
                // then don't both recording an additional snapshot
                if (output !== lastOutput) {
                    lastOutput = output;
                    snapshots.push({ input, output });
                }
            } catch (e) {
                console.log('Error creating snapshot for', macroname);
            }
        }
    }

    return macroSnapshots;
}

if (process.argv.length === 2) {
    createSnapshots().then(snapshots => {
        fs.writeFileSync(
            __dirname + '/snapshots.json',
            JSON.stringify(snapshots, null, 2)
        );
    });
} else {
    let macroName = process.argv[2];
    let args = process.argv.slice(3);
    snapshot(macroName, args)
        .then(result => console.log(result))
        .catch(e => console.error(e));
}
