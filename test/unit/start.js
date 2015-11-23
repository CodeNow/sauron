'use strict';

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var afterEach = lab.afterEach;
var beforeEach = lab.beforeEach;
var Code = require('code');
var expect = Code.expect;

var sinon = require('sinon');

var WorkerServer = require('../../lib/models/worker-server.js');
var RabbitMQ = require('../../lib/models/rabbitmq.js');
var Start = require('../../lib/start.js');

describe('start.js unit test', function () {
  describe('startup', function () {
    beforeEach(function (done) {
      sinon.stub(WorkerServer, 'listen');
      sinon.stub(RabbitMQ, 'publishWeaveStart');
      sinon.stub(RabbitMQ, 'create');
      done();
    });

    afterEach(function (done) {
      WorkerServer.listen.restore();
      RabbitMQ.publishWeaveStart.restore();
      RabbitMQ.create.restore();
      done();
    });

    it('should startup all services', function (done) {
      RabbitMQ.create.returns();
      RabbitMQ.publishWeaveStart.returns();
      WorkerServer.listen.yieldsAsync();

      Start.startup(function (err) {
        expect(err).to.not.exist();
        expect(RabbitMQ.create.calledOnce).to.be.true();
        expect(RabbitMQ.publishWeaveStart.calledOnce).to.be.true();
        expect(WorkerServer.listen.calledOnce).to.be.true();
        done();
      });
    });
  }); // end startup

  describe('shutdown', function () {
    beforeEach(function (done) {
      sinon.stub(WorkerServer, 'stop');
      sinon.stub(RabbitMQ, 'disconnectPublisher');
      done();
    });

    afterEach(function (done) {
      WorkerServer.stop.restore();
      RabbitMQ.disconnectPublisher.restore();
      done();
    });

    it('should shutdown all services', function (done) {
      WorkerServer.stop.yieldsAsync();
      RabbitMQ.disconnectPublisher.yieldsAsync();

      Start.shutdown(function (err) {
        expect(err).to.not.exist();
        expect(WorkerServer.stop.calledOnce).to.be.true();
        expect(RabbitMQ.disconnectPublisher.calledOnce).to.be.true();
        done();
      });
    });

    it('should cb err if worker server failed', function (done) {
      WorkerServer.stop.yieldsAsync('Balrogs');

      Start.shutdown(function (err) {
        expect(err).to.exist();
        done();
      });
    });
  }); // end shutdown
}); // end start.js unit test