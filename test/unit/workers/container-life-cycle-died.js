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
var RabbitMQ = require('../../../lib/models/rabbitmq.js');
var assign = require('101/assign');

var sinon = require('sinon');
var ponos = require('ponos');
var TaskFatalError = ponos.TaskFatalError;

var Events = require('../../../lib/models/events.js');
var containerLifeCycleDied = require('../../../lib/workers/container-life-cycle-died.js');

describe('container-life-cycle-died.js unit test', function () {

  describe('Unit Tests', function () {

    describe('run', function () {
      beforeEach(function (done) {
        sinon.stub(Events, 'handleDied');
        sinon.stub(Events, 'validateContainerJob');
        done();
      });

      afterEach(function (done) {
        Events.handleDied.restore();
        Events.validateContainerJob.restore();
        done();
      });

      it('should throw error if invalid job', function (done) {
        Events.validateContainerJob.returns(false);
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
        Events.validateContainerJob.returns(true);
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
        Events.validateContainerJob.returns(true);
        Events.handleDied.returns();
        containerLifeCycleDied()
          .then(function () {
            done();
          })
          .catch(done);
      });
    }); // end run
  });

  describe('Jobs', function () {

    var validJob = {
      host: 'http://2.1.1.1:4242',
      id: '237c9ccf14e89a6e23fb15f2d9132efd98878f6267b9f128f603be3b3e362472',
      from: 'weaveworks/weave:1.2.0',
      tags: 'test,build,run',
      inspectData: {
        Config: {
          ExposedPorts: {
            '6783/tcp': {},
            '6783/udp': {}
          }
        }
      }
    };
    var invalidJob = assign({}, validJob, { tags: ',' });

    describe('run', function () {
      beforeEach(function (done) {
        RabbitMQ.create();
        done();
      });

      it('should not throw an error if a valid job is passed', function (done) {
        containerLifeCycleDied(validJob)
          .then(function () {
            done();
          })
          .catch(done);
      });

      it('should throw error if no job is passed', function (done) {
        containerLifeCycleDied({})
          .catch(function (err) {
            expect(err).to.be.instanceOf(TaskFatalError);
            done();
          });
      });

      it('should throw an error if an invalid job is passed (no tags)', function (done) {
        containerLifeCycleDied(invalidJob)
          .catch(function (err) {
            expect(err).to.be.instanceOf(TaskFatalError);
            done();
          });
      });
    });
  });

});
