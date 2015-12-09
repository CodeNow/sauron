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
var Peers = require('../../lib/models/peers.js');
var RabbitMQ = require('../../lib/models/rabbitmq.js');
var Start = require('../../lib/start.js');

describe('start.js unit test', function () {
  describe('startup', function () {
    beforeEach(function (done) {
      sinon.stub(WorkerServer, 'listen');
      sinon.stub(RabbitMQ, 'publishWeaveStart');
      sinon.stub(Peers, 'getList');
      done();
    });

    afterEach(function (done) {
      WorkerServer.listen.restore();
      RabbitMQ.publishWeaveStart.restore();
      Peers.getList.restore();
      done();
    });

    it('should startup on add docks', function (done) {
      var peers = ['a', 'b'];
      RabbitMQ.publishWeaveStart.returns();
      WorkerServer.listen.yieldsAsync();
      Peers.getList.yieldsAsync(null, peers);

      Start.startup(function (err) {
        expect(err).to.not.exist();
        expect(RabbitMQ.publishWeaveStart.withArgs('a').calledOnce).to.be.true();
        expect(RabbitMQ.publishWeaveStart.withArgs('b').calledOnce).to.be.true();
        expect(WorkerServer.listen.calledOnce).to.be.true();
        done();
      });
    });

    it('should throw an error if `Peers.getList` throws an error', function (done) {
      RabbitMQ.publishWeaveStart.returns();
      WorkerServer.listen.yieldsAsync();
      Peers.getList.yieldsAsync('err');

      Start.startup(function (err) {
        expect(err).to.exist();
        expect(RabbitMQ.publishWeaveStart.called).to.be.false();
        done();
      });
    });

    it('should throw an error if `WorkerServer.listen` throws an error', function (done) {
      WorkerServer.listen.yieldsAsync('err');

      Start.startup(function (err) {
        expect(err).to.exist();
        expect(RabbitMQ.publishWeaveStart.called).to.be.false();
        done();
      });
    });

    it('should throw an error if `RabbitMQ.publishWeaveStart` throws an error', function (done) {
      RabbitMQ.publishWeaveStart.throws();
      WorkerServer.listen.yieldsAsync();
      Peers.getList.yieldsAsync(null, [1, 2, 3]);

      Start.startup(function (err) {
        expect(err).to.exist();
        sinon.assert.calledOnce(WorkerServer.listen);
        sinon.assert.calledOnce(Peers.getList);
        sinon.assert.calledOnce(RabbitMQ.publishWeaveStart);
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

    it('should throw an error if `WorkerServer` failed', function (done) {
      WorkerServer.stop.yieldsAsync(new Error());

      Start.shutdown(function (err) {
        expect(err).to.exist();
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });

    it('should throw an error if `RabbitMQ.disconnectPublisher` failed', function (done) {
      WorkerServer.stop.yieldsAsync();
      RabbitMQ.disconnectPublisher.yieldsAsync(new Error());

      Start.shutdown(function (err) {
        expect(err).to.be.an.instanceof(Error);
        done();
      });
    });
  }); // end shutdown
}); // end start.js unit test
