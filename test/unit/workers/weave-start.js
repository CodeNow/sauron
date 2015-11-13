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

var WeaveSetup = require('../../../lib/models/weave-setup.js');
var containerLifeCycleStarted = require('../../../lib/workers/weave-start.js');

describe('weave-start.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(WeaveSetup, 'setup');
      done();
    });

    afterEach(function (done) {
      WeaveSetup.setup.restore();
      done();
    });

    it('should throw error if setup failed', function (done) {
      WeaveSetup.setup.throws(new Error('test'));
      containerLifeCycleStarted({})
        .then(function () {
          throw new Error('should have thrown');
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(Error);
          done();
        });
    });

    it('should be fine if no errors', function (done) {
      WeaveSetup.setup.returns();
      containerLifeCycleStarted({})
        .then(function () {
          done();
        })
        .catch(done);
    });
  }); // end run
}); // end weave-start
