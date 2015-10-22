'use strict';
require('loadenv')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var Code = require('code');
var expect = Code.expect;

var BasePaths = require('../../../lib/middleware/base-paths.js');

describe('base-paths.js unit test', function() {
  describe('root', function() {
    it('should return 200 for success', function(done) {
      var res = {
        status: function (code) {
          expect(code).to.equal(200);
          return {
            json: function (data) {
              expect(data).to.deep.equal({
                message: process.env.npm_package_description,
                git: process.env.npm_package_gitHead,
                config: process.env
              });
              done();
            }
          };
        }
      };
      BasePaths.root({}, res);
    });
  }); // end root

  describe('all', function() {
    it('should return 200 for success', function(done) {
      var res = {
        status: function (code) {
          expect(code).to.equal(404);
          return {
            json: function (data) {
              expect(data).to.deep.equal({
                message: 'route not implemented'
              });
              done();
            }
          };
        }
      };
      BasePaths.all({}, res);
    });
  }); // end all
}); // end base-paths.js unit test
