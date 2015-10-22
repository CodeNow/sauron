'use strict';

require('loadenv')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var afterEach = lab.afterEach;
var beforeEach = lab.beforeEach;
var Code = require('code');
var expect = Code.expect;

var sinon = require('sinon');

var containerIdActions = require('../../../lib/middleware/containers-id-actions.js');
var WeaveWrapper = require('../../../lib/models/weave-wrapper.js');


describe('containers-id-actions.js unit test', function() {
  describe('attach', function() {
    beforeEach(function(done) {
      sinon.stub(WeaveWrapper, 'attach');
      done();
    });

    afterEach(function(done) {
      WeaveWrapper.attach.restore();
      done();
    });

    it('should return 200 for success', function(done) {
      var testIp = '10.0.0.0';
      WeaveWrapper.attach.yieldsAsync(null, testIp);
      var req = {
        params: {
          containerId: '135234542'
        }
      };
      var res = {
        status: function (code) {
          expect(code).to.equal(200);
          return {
            json: function (data) {
              expect(data.containerIp).to.equal(testIp);
              done();
            }
          };
        }
      };
      containerIdActions.attach(req, res);
    });

    it('should next with err on error', function(done) {
      WeaveWrapper.attach.yieldsAsync('error');
      var req = {
        params: {
          containerId: '135234542'
        }
      };

      containerIdActions.attach(req, {}, function (err) {
        expect(err).to.exist();
        done();
      });
    });
  }); // end attach
}); // end containers-id-actions.js unit test
