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
var ponos = require('ponos');
var TaskFatalError = ponos.TaskFatalError;

var Events = require('../../../lib/models/events.js');
var containerLifeCycleDied = require('../../../lib/workers/container-life-cycle-died.js');

describe('container-life-cycle-died.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(Events, 'handleDied');
      sinon.stub(Events, 'validateJob');
      done();
    });

    afterEach(function (done) {
      Events.handleDied.restore();
      Events.validateJob.restore();
      done();
    });

    it('should throw error if invalid job', function (done) {
      Events.validateJob.returns(false);
      containerLifeCycleDied({})
        .then(function () {
          throw new Error('should have thrown');
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(TaskFatalError);
          done();
        });
    });

    it('should throw error if handleDied throws', function (done) {
      Events.validateJob.returns(true);
      Events.handleDied.throws(new Error('test'));
      containerLifeCycleDied({})
        .then(function () {
          throw new Error('should have thrown');
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(Error);
          done();
        });
    });

    it('should be fine if no errors', function (done) {
      Events.validateJob.returns(true);
      Events.handleDied.returns();
      containerLifeCycleDied({})
        .then(function () {
          done();
        })
        .catch(done);
    });
  }); // end run
}); // end container-life-cycle-died unit test
