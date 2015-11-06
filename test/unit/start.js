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

var Redis = require('../../lib/models/redis.js');
var WorkerServer = require('../../lib/models/worker-server.js');
var WeaveSetup = require('../../lib/models/weave-setup.js');
var RabbitMQ = require('../../lib/models/rabbitmq.js');
var Start = require('../../lib/start.js');

describe('start.js unit test', function () {
  describe('startup', function () {
    beforeEach(function (done) {
      sinon.stub(Redis, 'connect');
      sinon.stub(WorkerServer, 'listen');
      sinon.stub(WeaveSetup, 'setup');
      sinon.stub(RabbitMQ, 'create');
      done();
    });

    afterEach(function (done) {
      Redis.connect.restore();
      WorkerServer.listen.restore();
      WeaveSetup.setup.restore();
      RabbitMQ.create.restore();
      done();
    });

    it('should startup all services', function (done) {
      Redis.connect.returns();
      RabbitMQ.create.returns();
      WeaveSetup.setup.yieldsAsync();
      WorkerServer.listen.yieldsAsync();

      Start.startup(function (err) {
        expect(err).to.not.exist();
        expect(Redis.connect.calledOnce).to.be.true();
        expect(RabbitMQ.create.calledOnce).to.be.true();
        expect(WeaveSetup.setup.calledOnce).to.be.true();
        expect(WorkerServer.listen.calledOnce).to.be.true();
        done();
      });
    });

    it('should cb err if weave setup failed', function (done) {
      Redis.connect.returns();
      WorkerServer.listen.returns();
      RabbitMQ.create.returns();
      WeaveSetup.setup.yieldsAsync('Balrogs');

      Start.startup(function (err) {
        expect(err).to.exist();
        done();
      });
    });
  }); // end startup

  describe('shutdown', function () {
    beforeEach(function (done) {
      sinon.stub(Redis, 'disconnect');
      sinon.stub(WorkerServer, 'stop');
      sinon.stub(RabbitMQ, 'disconnectPublisher');
      done();
    });

    afterEach(function (done) {
      Redis.disconnect.restore();
      WorkerServer.stop.restore();
      RabbitMQ.disconnectPublisher.restore();
      done();
    });

    it('should shutdown all services', function (done) {
      Redis.disconnect.returns();
      WorkerServer.stop.yieldsAsync();
      RabbitMQ.disconnectPublisher.yieldsAsync();

      Start.shutdown(function (err) {
        expect(err).to.not.exist();
        expect(Redis.disconnect.calledOnce).to.be.true();
        expect(WorkerServer.stop.calledOnce).to.be.true();
        expect(RabbitMQ.disconnectPublisher.calledOnce).to.be.true();
        done();
      });
    });

    it('should cb err if worker server failed', function (done) {
      Redis.disconnect.returns();
      WorkerServer.stop.yieldsAsync('Balrogs');

      Start.shutdown(function (err) {
        expect(err).to.exist();
        done();
      });
    });
  }); // end shutdown
}); // end start.js unit test