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

var Docker = require('../../lib/models/docker.js');
var RabbitMQ = require('../../lib/models/rabbitmq.js');
var Start = require('../../lib/start.js');
var WorkerServer = require('../../lib/models/worker-server.js');

describe('start.js unit test', function () {
  describe('startup', function () {
    beforeEach(function (done) {
      sinon.stub(WorkerServer, 'listen');
      sinon.stub(RabbitMQ, 'publishWeaveStart');
      sinon.stub(Docker, 'info');
      done();
    });

    afterEach(function (done) {
      WorkerServer.listen.restore();
      RabbitMQ.publishWeaveStart.restore();
      Docker.info.restore();
      done();
    });

    it('should startup on add docks', function (done) {
      var peers = [{
        Host: '10.0.0.1:4242',
        Labels: {
          size: 'large',
          org: 'codenow'
        }
      }, {
        Host: '10.0.0.2:4242',
        Labels: {
          size: 'large',
          org: 'other'
        }
      }];
      RabbitMQ.publishWeaveStart.returns();
      WorkerServer.listen.yieldsAsync();
      Docker.info.yieldsAsync(null, peers);

      Start.startup(function (err) {
        if (err) { return done(err) }

        sinon.assert.calledTwice(RabbitMQ.publishWeaveStart)
        sinon.assert.calledWith(RabbitMQ.publishWeaveStart, {
          dockerUri: 'http://10.0.0.2:4242',
          orgId: 'other'
        })
        sinon.assert.calledWith(RabbitMQ.publishWeaveStart, {
          dockerUri: 'http://10.0.0.1:4242',
          orgId: 'codenow'
        })
        expect(WorkerServer.listen.calledOnce).to.be.true();
        done();
      });
    });

    it('should throw an error if `Docker.info` throws an error', function (done) {
      RabbitMQ.publishWeaveStart.returns();
      WorkerServer.listen.yieldsAsync();
      Docker.info.yieldsAsync('err');

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
      var peers = [{
        dockerHost: '10.0.0.1:4242',
        Labels: [{ name: 'size', value: 'large' }, { name: 'org', value: 'codenow' }]
      }, {
        dockerHost: '10.0.0.2:4242',
        Labels: [{ name: 'size', value: 'large' }, { name: 'org', value: 'other' }]
      }];
      RabbitMQ.publishWeaveStart.throws();
      WorkerServer.listen.yieldsAsync();
      Docker.info.yieldsAsync(null, peers);

      Start.startup(function (err) {
        expect(err).to.exist();
        sinon.assert.calledOnce(WorkerServer.listen);
        sinon.assert.calledOnce(Docker.info);
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
      var errMessage = 'WorkerServer error';
      WorkerServer.stop.yieldsAsync(new Error(errMessage));

      Start.shutdown(function (err) {
        expect(err).to.exist();
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal(errMessage);
        done();
      });
    });

    it('should throw an error if `RabbitMQ.disconnectPublisher` failed', function (done) {
      var errMessage = 'RabbitMQ.disconnectPublisher error';
      WorkerServer.stop.yieldsAsync();
      RabbitMQ.disconnectPublisher.yieldsAsync(new Error(errMessage));

      Start.shutdown(function (err) {
        expect(err).to.be.an.instanceof(Error);
        expect(err.message).to.equal(errMessage);
        done();
      });
    });
  }); // end shutdown
}); // end start.js unit test
