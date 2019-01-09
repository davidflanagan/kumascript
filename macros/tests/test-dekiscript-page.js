/* jshint node: true, mocha: true, esversion: 6 */

// There used to be a DekiScript-Page.ejs macro, and this test
// tested its main functions. The features of that macro are now
// part of ../../src/environment.js, but we're still testing them here.

const fs = require('fs'),
      path = require('path'),
      sinon = require('sinon'),
      utils = require('./utils'),
      chai = require('chai'),
      assert = chai.assert,
      itMacro = utils.itMacro,
      describeMacro = utils.describeMacro,
      beforeEachMacro = utils.beforeEachMacro,
      fixture_dir = path.resolve(__dirname, 'fixtures');

// Load fixture data.
const fixtures = {
    spe: {
        data: null,
        filename: 'subpagesExpand-depth-gt-1.json'
    },
    spe0: {
        data: null,
        filename: 'subpagesExpand-depth-of-0.json'
    },
    spe1: {
        data: null,
        filename: 'subpagesExpand-depth-of-1.json'
    },
    sp: {
        data: null,
        filename: 'subpages-depth-gt-1.json'
    },
    sp0: {
        data: null,
        filename: 'subpages-depth-of-0.json'
    },
    sp1: {
        data: null,
        filename: 'subpages-depth-of-1.json'
    },
    trans: {
        data: null,
        filename: 'translations.json'
    }
};
for (const name in fixtures) {
    fixtures[name].data = JSON.parse(
        fs.readFileSync(
            path.resolve(fixture_dir, fixtures[name].filename),
            'utf8'
        )
    );
}
const base_url = 'https://developer.mozilla.org';
const fix_url = '/en-US/docs/Web/HTTP/Basics_of_HTTP';
const titles = [
    'Choosing between www and non-www URLs',
    'Data URLs',
    'Evolution of HTTP',
    'Identifying resources on the Web',
    'MIME types'
];

function getProps(items, prop_name) {
    var result = [];
    for (const item of items) {
        result.push(item[prop_name]);
    }
    return result;
}

describeMacro('dekiscript-page', function () {
    itMacro('dummy', function (macro) {
        let pkg = macro.ctx.page;
        assert.isObject(pkg);
        assert.isFunction(pkg.hasTag);
        assert.isFunction(pkg.subpages);
        assert.isFunction(pkg.subpagesExpand);
        assert.isFunction(pkg.subPagesFlatten);
        assert.isFunction(pkg.translations);
    });
    describe('test "subpages"', function () {
        beforeEachMacro(function (macro) {
            const fetch_stub = sinon.stub(),
                  fetch_url = base_url + fix_url + '$children',
                  fetch_url0 = fetch_url + '?depth=0',
                  fetch_url1 = fetch_url + '?depth=1',
                  fetch_url2 = fetch_url + '?depth=2';
            fetch_stub.withArgs(fetch_url).returns(fixtures.sp.data);
            fetch_stub.withArgs(fetch_url0).returns(fixtures.sp0.data);
            fetch_stub.withArgs(fetch_url1).returns(fixtures.sp1.data);
            fetch_stub.withArgs(fetch_url2).returns(fixtures.sp.data);
            macro.ctx.mdn.fetchJSONResource = fetch_stub;
        });
        itMacro('One argument (non-null)', function (macro) {
            return macro.ctx.page.subpages(fix_url).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 5);
                assert.sameMembers(getProps(res, 'title'), titles);
                assert.notProperty(res[0], 'tags');
                assert.notProperty(res[0], 'translations');
                assert.equal(res[4].subpages.length, 1);
            });
        });
        itMacro('One argument (null)', function (macro) {
            macro.ctx.env.url = base_url + fix_url;
            return macro.ctx.page.subpages(null).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 5);
                assert.sameMembers(getProps(res, 'title'), titles);
                assert.notProperty(res[0], 'tags');
                assert.notProperty(res[0], 'translations');
                assert.equal(res[4].subpages.length, 1);
            });
        });
        itMacro('Two arguments (depth=0)', function (macro) {
            return macro.ctx.page.subpages(fix_url, 0).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 0);
            });
        });
        itMacro('Two arguments (depth=1)', function (macro) {
            return macro.ctx.page.subpages(fix_url, 1).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 5);
                assert.sameMembers(getProps(res, 'title'), titles);
                assert.notProperty(res[0], 'tags');
                assert.notProperty(res[0], 'translations');
                assert.equal(res[4].subpages.length, 0);
            });
        });
        itMacro('Two arguments (depth=2)', function (macro) {
            return macro.ctx.page.subpages(fix_url, 2).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 5);
                assert.sameMembers(getProps(res, 'title'), titles);
                assert.notProperty(res[0], 'tags');
                assert.notProperty(res[0], 'translations');
                assert.equal(res[4].subpages.length, 1);
            });
        });
        itMacro('Three arguments (depth=2, self=true)', function (macro) {
            return macro.ctx.page.subpages(fix_url, 2, true).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 1);
                assert.equal(res[0].slug, 'Web/HTTP/Basics_of_HTTP');
                const sub = res[0].subpages;
                assert.equal(sub.length, 5);
                assert.sameMembers(getProps(sub, 'title'), titles);
                assert.notProperty(sub[0], 'tags');
                assert.notProperty(sub[0], 'translations');
                assert.equal(sub[4].subpages.length, 1);
            });
        });
        itMacro('Three arguments (depth=0, self=true)', function (macro) {
            return macro.ctx.page.subpages(fix_url, 0, true).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 1);
                assert.notProperty(res[0], 'tags');
                assert.notProperty(res[0], 'translations');
                assert.equal(res[0].slug, 'Web/HTTP/Basics_of_HTTP');
                assert.equal(res[0].subpages.length, 0);
            });
        });
    });
    describe('test "subpagesExpand"', function () {
        beforeEachMacro(function (macro) {
            const fetch_stub = sinon.stub(),
                  fetch_url = base_url + fix_url + '$children?expand',
                  fetch_url0 = fetch_url + '&depth=0',
                  fetch_url1 = fetch_url + '&depth=1',
                  fetch_url2 = fetch_url + '&depth=2';
            fetch_stub.withArgs(fetch_url).returns(fixtures.spe.data);
            fetch_stub.withArgs(fetch_url0).returns(fixtures.spe0.data);
            fetch_stub.withArgs(fetch_url1).returns(fixtures.spe1.data);
            fetch_stub.withArgs(fetch_url2).returns(fixtures.spe.data);
            macro.ctx.mdn.fetchJSONResource = fetch_stub;
        });
        itMacro('One argument (non-null)', function (macro) {
            return macro.ctx.page.subpagesExpand(fix_url).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 5);
                assert.sameMembers(getProps(res, 'title'), titles);
                assert.property(res[0], 'tags');
                assert.equal(res[0].tags.length, 3);
                assert.property(res[0], 'translations');
                assert.equal(res[0].translations.length, 3);
                assert.equal(res[4].subpages.length, 1);
            });
        });
        itMacro('One argument (null)', function (macro) {
            macro.ctx.env.url = base_url + fix_url;
            return macro.ctx.page.subpagesExpand(null).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 5);
                assert.sameMembers(getProps(res, 'title'), titles);
                assert.property(res[0], 'tags');
                assert.equal(res[0].tags.length, 3);
                assert.property(res[0], 'translations');
                assert.equal(res[0].translations.length, 3);
                assert.equal(res[4].subpages.length, 1);
            });
        });
        itMacro('Two arguments (depth=0)', function (macro) {
            return macro.ctx.page.subpagesExpand(fix_url, 0).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 0);
            });
        });
        itMacro('Two arguments (depth=1)', function (macro) {
            return macro.ctx.page.subpagesExpand(fix_url, 1).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 5);
                assert.sameMembers(getProps(res, 'title'), titles);
                assert.property(res[0], 'tags');
                assert.equal(res[0].tags.length, 3);
                assert.property(res[0], 'translations');
                assert.equal(res[0].translations.length, 3);
                assert.equal(res[4].subpages.length, 0);
            });
        });
        itMacro('Two arguments (depth=2)', function (macro) {
            return macro.ctx.page.subpagesExpand(fix_url, 2).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 5);
                assert.sameMembers(getProps(res, 'title'), titles);
                assert.property(res[0], 'tags');
                assert.equal(res[0].tags.length, 3);
                assert.property(res[0], 'translations');
                assert.equal(res[0].translations.length, 3);
                assert.equal(res[4].subpages.length, 1);
            });
        });
        itMacro('Three arguments (depth=2, self=true)', function (macro) {
            return macro.ctx.page.subpagesExpand(fix_url, 2, true).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 1);
                assert.equal(res[0].slug, 'Web/HTTP/Basics_of_HTTP');
                const sub = res[0].subpages;
                assert.equal(sub.length, 5);
                assert.sameMembers(getProps(sub, 'title'), titles);
                assert.property(sub[0], 'tags');
                assert.equal(sub[0].tags.length, 3);
                assert.property(sub[0], 'translations');
                assert.equal(sub[0].translations.length, 3);
                assert.equal(sub[4].subpages.length, 1);
            });
        });
        itMacro('Three arguments (depth=0, self=true)', function (macro) {
            return macro.ctx.page.subpagesExpand(fix_url, 0, true).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 1);
                assert.property(res[0], 'tags');
                assert.equal(res[0].tags.length, 2);
                assert.property(res[0], 'translations');
                assert.equal(res[0].translations.length, 7);
                assert.equal(res[0].slug, 'Web/HTTP/Basics_of_HTTP');
                assert.equal(res[0].subpages.length, 0);
            });
        });
    });
    describe('test "translations"', function () {
        beforeEachMacro(function (macro) {
            const fetch_stub = sinon.stub(),
                  fetch_url = base_url + fix_url + '$json',
                  fetch_junk_url = base_url + '/en-US/docs/junk$json';
            fetch_stub.withArgs(fetch_url).returns(fixtures.trans.data);
            fetch_stub.withArgs(fetch_junk_url).returns(null);
            macro.ctx.mdn.fetchJSONResource = fetch_stub;
        });
        itMacro('One argument (non-null)', function (macro) {
            return macro.ctx.page.translations(fix_url).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 7);
                assert.sameMembers(
                    getProps(res, 'locale'),
                    ['es', 'fr', 'ja', 'ko', 'pt-BR', 'ru', 'zh-CN']
                );
            });
        });
        itMacro('One argument (null)', function (macro) {
            macro.ctx.env.url = base_url + fix_url;
            return macro.ctx.page.translations(null).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 7);
                assert.sameMembers(
                    getProps(res, 'locale'),
                    ['es', 'fr', 'ja', 'ko', 'pt-BR', 'ru', 'zh-CN']
                );
            });
        });
        itMacro('One argument (return null)', function (macro) {
            const junk_url = '/en-US/docs/junk$json';
            return macro.ctx.page.translations(junk_url).then(res => {
                assert.isArray(res);
                assert.equal(res.length, 0);
            });
        });
    });
});
