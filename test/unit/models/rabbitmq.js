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
var Hermes = require('runnable-hermes');

var RabbitMQ = require('../../../lib/models/rabbitmq.js');

describe('rabbitmq.js unit test', function () {
  beforeEach(function (done) {
    process.env.RABBITMQ_HOSTNAME = 'Goblins';
    process.env.RABBITMQ_PASSWORD = 'Orcs';
    process.env.RABBITMQ_PORT = '1738';
    process.env.RABBITMQ_USERNAME = 'Azog';
    done();
  });

  afterEach(function (done) {
    delete process.env.RABBITMQ_HOSTNAME;
    delete process.env.RABBITMQ_PASSWORD;
    delete process.env.RABBITMQ_PORT;
    delete process.env.RABBITMQ_USERNAME;
    done();
  });

  describe('create', function () {
    beforeEach(function (done) {
      sinon.stub(Hermes.prototype, 'connect');
      done();
    });

    afterEach(function (done) {
      Hermes.prototype.connect.restore();
      done();
    });

    it('should set both client', function (done) {
      var testClient = 'Bolg';
      Hermes.prototype.connect.returns({
        on: sinon.stub().returns(testClient)
      });

      RabbitMQ.create();

      expect(RabbitMQ._publisher).to.exist();
      expect(RabbitMQ._subscriber).to.exist();
      done();
    });
  }); // end create

  describe('getSubscriber', function () {
    it('should return subscriber clietn', function (done) {
      RabbitMQ._subscriber = 'test';
      expect(RabbitMQ.getSubscriber()).to.equal('test');
      done();
    });
  }); // end getSubscriber

  describe('disconnectPublisher', function () {
    beforeEach(function (done) {
      RabbitMQ._publisher = {
        close: sinon.stub()
      };
      done();
    });

    afterEach(function (done) {
      RabbitMQ._publisher = null;
      done();
    });

    it('should close _publisher', function (done) {
      RabbitMQ._publisher.close.yieldsAsync();

      RabbitMQ.disconnectPublisher(function () {
        expect(RabbitMQ._publisher.close.called).to.be.true();
        done();
      });
    });
  }); // end disconnectPublisher

  describe('publishContainerNetworkAttached', function () {
    beforeEach(function (done) {
      sinon.stub(RabbitMQ, '_dataCheck');
      RabbitMQ._publisher = {
        publish: sinon.stub()
      };
      done();
    });

    afterEach(function (done) {
      RabbitMQ._dataCheck.restore();
      RabbitMQ._publisher = null;
      done();
    });

    it('should throw if missing data', function (done) {
      RabbitMQ._dataCheck.throws();

      expect(function () {
        RabbitMQ.publishContainerNetworkAttached();
      }).to.throw();

      done();
    });

    it('should call publish with correct key and data', function (done) {
      RabbitMQ._dataCheck.returns();
      RabbitMQ._publisher.publish.returns();

      RabbitMQ.publishContainerNetworkAttached({
        containerId: 'testId',
        containerIp: '10.0.0.2'
      });

      expect(RabbitMQ._publisher.publish.withArgs('container.network.attached')
        .calledOnce).to.be.true();
      expect(Object.keys(RabbitMQ._publisher.publish.args[0][1]))
        .to.contain(['timestamp', 'id', 'containerId', 'containerIp']);
      done();
    });
  }); // end publishContainerNetworkAttached

  describe('publishContainerNetworkAttachFailed', function () {
    beforeEach(function (done) {
      sinon.stub(RabbitMQ, '_dataCheck');
      RabbitMQ._publisher = {
        publish: sinon.stub()
      };
      done();
    });

    afterEach(function (done) {
      RabbitMQ._dataCheck.restore();
      RabbitMQ._publisher = null;
      done();
    });

    it('should throw if missing data', function (done) {
      RabbitMQ._dataCheck.throws();

      expect(function () {
        RabbitMQ.publishContainerNetworkAttachFailed();
      }).to.throw();

      done();
    });

    it('should call publish with correct key and data', function (done) {
      RabbitMQ._dataCheck.returns();
      RabbitMQ._publisher.publish.returns();

      RabbitMQ.publishContainerNetworkAttachFailed({
        containerId: 'testId',
        err: '10.0.0.2'
      });

      expect(RabbitMQ._publisher.publish.withArgs('container.network.attach-failed')
        .calledOnce).to.be.true();
      expect(Object.keys(RabbitMQ._publisher.publish.args[0][1]))
        .to.contain(['timestamp', 'id', 'containerId', 'err']);
      done();
    });
  }); // end publishContainerNetworkAttachFailed

  describe('_dataCheck', function () {
    it('should throw if missing keys', function (done) {
      var testData = {
        Goblins: 'Azog',
      };

      expect(function () {
        RabbitMQ._dataCheck(testData, ['Goblins', 'Hobgoblins']);
      }).to.throw();

      done();
    });

    it('should return if keys present', function (done) {
      var testData = {
        Goblins: 'Azog',
      };

      RabbitMQ._dataCheck(testData, ['Goblins']);

      done();
    });
  }); // end _dataCheck

  describe('_dataCheck', function () {
    it('should throw if missing keys', function (done) {
      expect(function () {
        RabbitMQ._handleFatalError(new Error('Gothmog'));
      }).to.throw();

      done();
    });
  }); // end _dataCheck
}); // end rabbitmq.js unit test