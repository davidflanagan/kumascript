/* jshint node: true, mocha: true, esversion: 6 */

// Provides utilities that as a whole constitute the macro test framework.

const Environment = require('../../src/environment.js');
const Templates = require('../../src/templates.js');

function createMacroTestObject(macroName) {
    let templates = new Templates(__dirname + "/../../macros/");
    let pageContext = {
        locale: 'en-US',
        url: 'https://developer.mozilla.org/'
    };
    let environment = new Environment(pageContext, templates, true);

    return {
        /**
         * Give the test-case writer access to the macro's globals (ctx).
         * For example, "macro.ctx.env.locale" can be manipulated to something
         * other than 'en-US' or "macro.ctx.wiki.getPage" can be mocked
         * using "sinon.stub()" to avoid network calls.
         */
        ctx: environment.prototypeEnvironment,

        /**
         * Use this function to make test calls on the named macro, if
         * applicable.  Its arguments become the arguments to the
         * macro. It returns a promise.
         */
        async call(...args) {
            let rendered = await templates.render(
                macroName,
                environment.getExecutionContext(args)
            );
            return rendered;
        }
    };
}

/**
 * This is the essential function for testing macros. Use it as
 * you would use mocha's "describe", with the exception that the
 * first argument must be the name of the macro being tested.
 *
 * @param {string} macroName
 * @param {function():void} runTests
 */
function describeMacro(macroName, runTests) {
    describe(`test "${macroName}"`, function () {
        beforeEach(function() {
            this.macro = createMacroTestObject(macroName);
        });
        runTests();
    });
}

/**
 * Syntactic sugar that avoids thinking about the mocha context "this".
 * Use this function as you would use mocha's "it", with the exception
 * that the callback function ("runTest" in this case) should accept a
 * single argument that is the macro test object.
 *
 * @param {string} title
 * @param {function(Macro):void} runTest
 */
function itMacro(title, runTest) {
    it(title, function () {
        // Assumes that setup returns a promise (if async) or
        // undefined (if synchronous).
        return runTest(this.macro);
    });
}

/**
 * Syntactic sugar that avoids thinking about the mocha context "this". Use
 * this function as you would use mocha's "beforeEach", with the exception
 * that the callback function ("setup" in this case) should accept a single
 * argument that is the macro test object.
 *
 * @param {function(Macro):void} setup
 */
function beforeEachMacro(setup) {
    beforeEach(function () {
        // Assumes that setup returns a promise (if async) or
        // undefined (if synchronous).
        return setup(this.macro);
    });
}

/**
 * Syntactic sugar that avoids thinking about the mocha context "this". Use
 * this function as you would use mocha's "afterEach", with the exception
 * that the callback function ("teardown" in this case) should accept a single
 * argument that is the macro test object.
 *
 * @param {function(Macro):void} teardown
 */
function afterEachMacro(teardown) {
    afterEach(function () {
        // Assumes that teardown returns a promise (if async) or
        // undefined (if synchronous).
        return teardown(this.macro);
    });
}

// ### Exported public API
module.exports = {
    itMacro: itMacro,
    describeMacro: describeMacro,
    afterEachMacro: afterEachMacro,
    beforeEachMacro: beforeEachMacro
};