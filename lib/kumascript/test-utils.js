// ## KumaScript testing utilities
//
// Provides utilities used by many tests.

/*jshint node: true, expr: false, boss: true */

// ### Prerequisites
var fs = require('fs'),
    path = require('path'),
    morgan = require('morgan'),
    express = require('express'),
    request = require('request'),
    ks_utils = require('./utils.js'),
    FIXTURES_PATH = path.join(__dirname, '..', '..', 'tests', 'fixtures');

var DEBUG = false;

/**
 * Creates an HTTP server for fixtures
 */
function createTestServer (port) {
    var app = express();
    if (DEBUG) {
        app.use(morgan(
            'TEST: :method :url :status ' +
            ':res[content-length] - :response-time ms'
        ));
    }
    app.use(function (req, res, mw_next) {
        // Force a delay, which tickles async bugs in need of fixes
        setTimeout(mw_next, 50);
    });
    app.use(express.static(FIXTURES_PATH));

    var server = app.listen(port || 9001);

    app.close = function () {
        server.close();
    };

    return app;
}

function readTestFixture(relpath, done, callback) {
    var fullpath = path.join(FIXTURES_PATH, relpath);
    fs.readFile(fullpath, 'utf8', function (err, data) {
        if (err) {
            done(err);
        } else {
            callback(data);
        }
    });
}

function testRequest(req_options, done, callback) {
    request(req_options, function (err, resp, result) {
        if (!err) {
            callback(resp, result);
        }
        done(err);
    });
}

function testRequestExpected(req_options, expected_relpath, done, callback) {
    readTestFixture(expected_relpath, done, function(expected) {
        testRequest(req_options, done, function (resp, result) {
            callback(resp, result, expected);
        });
    });
}

// ### Exported public API
module.exports = {
    createTestServer: createTestServer,
    readTestFixture: readTestFixture,
    testRequest: testRequest,
    testRequestExpected: testRequestExpected
};
