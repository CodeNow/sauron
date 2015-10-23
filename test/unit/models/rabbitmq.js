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
var hermesClient = require('runnable-hermes');

var RabbitMq = require('../../../lib/models/rabbitmq.js');

describe('rabbitmq.js unit test', function() {
  beforeEach(function(done) {
    process.env.RABBITMQ_HOSTNAME = 'Goblins';
    process.env.RABBITMQ_PASSWORD = 'Orcs';
    process.env.RABBITMQ_PORT = '1738';
    process.env.RABBITMQ_USERNAME = 'Azog';
    done();
  });

  afterEach(function(done) {
    delete process.env.RABBITMQ_HOSTNAME;
    delete process.env.RABBITMQ_PASSWORD;
    delete process.env.RABBITMQ_PORT;
    delete process.env.RABBITMQ_USERNAME;
    done();
  });

  describe('connect', function() {
    beforeEach(function(done) {
      sinon.stub(hermesClient.prototype, 'connect');
      done();
    });

    afterEach(function(done) {
      hermesClient.prototype.connect.restore();
      done();
    });

    it('should set client', function(done) {
      var testClient = 'Bolg';
      hermesClient.prototype.connect.returns({
        on: sinon.stub().returns(testClient)
      });

      RabbitMq.connect();

      expect(RabbitMq.client).to.equal(testClient);
      done();
    });
  }); // end connect

  describe('disconnect', function() {
    beforeEach(function(done) {
      RabbitMq.client = {
        close: sinon.stub()
      };
      done();
    });

    afterEach(function(done) {
      RabbitMq.client = null;
      done();
    });

    it('should close client', function(done) {
      RabbitMq.client.close.yieldsAsync();

      RabbitMq.disconnect(function () {
        expect(RabbitMq.client.close.called).to.be.true();
        done();
      });
    });
  }); // end disconnect

  describe('publishContainerNetworkAttached', function() {
    beforeEach(function(done) {
      sinon.stub(RabbitMq, '_dataCheck');
      RabbitMq.client = {
        publish: sinon.stub()
      };
      done();
    });

    afterEach(function(done) {
      RabbitMq._dataCheck.restore();
      RabbitMq.client = null;
      done();
    });

    it('should throw if missing data', function(done) {
      RabbitMq._dataCheck.throws();

      expect(function () {
        RabbitMq.publishContainerNetworkAttached();
      }).to.throw();

      done();
    });

    it('should call publish with correct key and data', function(done) {
      RabbitMq._dataCheck.returns();
      RabbitMq.client.publish.returns();

      RabbitMq.publishContainerNetworkAttached({
        containerId: 'testId',
        containerIp: '10.0.0.2'
      });

      expect(RabbitMq.client.publish.withArgs('container.network.attached')
        .calledOnce).to.be.true();
      expect(Object.keys(RabbitMq.client.publish.args[0][1]))
        .to.contain(['timestamp', 'id', 'containerId', 'containerIp']);
      done();
    });
  }); // end publishContainerNetworkAttached

  describe('_dataCheck', function () {
    it('should throw if missing keys', function (done) {
      var testData = {
        Goblins: 'Azog',
      };

      expect(function () {
        RabbitMq._dataCheck(testData, ['Goblins', 'Hobgoblins']);
      }).to.throw();

      done();
    });

    it('should return if keys present', function (done) {
      var testData = {
        Goblins: 'Azog',
      };

      RabbitMq._dataCheck(testData, ['Goblins']);

      done();
    });
  }); // end _dataCheck

  describe('_dataCheck', function () {
    it('should throw if missing keys', function (done) {
      expect(function () {
        RabbitMq._handleFatalError(new Error('Gothmog'));
      }).to.throw();

      done();
    });
  }); // end _dataCheck
}); // end rabbitmq.js unit test