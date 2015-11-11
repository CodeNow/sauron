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
var containerLifeCycleStarted = require('../../../lib/workers/container-life-cycle-started.js');

describe('container-life-cycle-started.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(Events, 'handleStartedAsync');
      sinon.stub(Events, 'validateJob');
      done();
    });

    afterEach(function (done) {
      Events.handleStartedAsync.restore();
      Events.validateJob.restore();
      done();
    });

    it('should throw error if invalid job', function (done) {
      Events.validateJob.returns(false);
      containerLifeCycleStarted({})
        .then(function () {
          throw new Error('should have thrown');
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(TaskFatalError);
          done();
        });
    });

    it('should throw error if handleStartedAsync failed', function (done) {
      Events.validateJob.returns(true);
      Events.handleStartedAsync.throws(new Error('test'));
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
      Events.validateJob.returns(true);
      Events.handleStartedAsync.returns();
      containerLifeCycleStarted({})
        .then(function () {
          done();
        })
        .catch(done);
    });
  }); // end run
}); // end container-life-cycle-started
