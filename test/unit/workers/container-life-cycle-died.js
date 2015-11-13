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
var ErrorCat = require('error-cat');

var RabbitMQ = require('../../../lib/models/rabbitmq.js');
var Events = require('../../../lib/models/events.js');
var containerLifeCycleDied = require('../../../lib/workers/container-life-cycle-died.js');
var WeaveDiedError = require('../../../lib/errors/weave-died-error.js');

describe('container-life-cycle-died.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(Events, 'handleDied');
      sinon.stub(RabbitMQ, 'publishWeaveStart');
      sinon.stub(Events, 'validateJob');
      sinon.stub(ErrorCat.prototype, 'report');
      done();
    });

    afterEach(function (done) {
      Events.handleDied.restore();
      Events.validateJob.restore();
      RabbitMQ.publishWeaveStart.restore();
      ErrorCat.prototype.report.restore();
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

    it('should throw error if handleDied failed', function (done) {
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

    it('should report on WeaveDiedError', function (done) {
      Events.validateJob.returns(true);
      Events.handleDied.throws(new WeaveDiedError('test'));
      RabbitMQ.publishWeaveStart.returns();
      containerLifeCycleDied({})
        .then(function () {
          expect(ErrorCat.prototype.report.calledOnce).to.be.true();
          done();
        })
        .catch(done);
    });

    it('should publishWeaveStart on WeaveDiedError', function (done) {
      Events.validateJob.returns(true);
      Events.handleDied.throws(new WeaveDiedError('test'));
      RabbitMQ.publishWeaveStart.returns();
      containerLifeCycleDied({})
        .then(function () {
          expect(RabbitMQ.publishWeaveStart.calledOnce).to.be.true();
          done();
        })
        .catch(done);
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
