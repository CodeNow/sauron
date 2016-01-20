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
      RabbitMQ._publisher = {
        publish: sinon.stub()
      };
      done();
    });

    afterEach(function (done) {
      RabbitMQ._publisher = null;
      done();
    });

    it('should throw if missing data', function (done) {
      expect(function () {
        RabbitMQ.publishContainerNetworkAttached();
      }).to.throw();

      done();
    });

    it('should call publish with correct key and data', function (done) {
      RabbitMQ._publisher.publish.returns();

      var data = {
        containerIp: '10.0.0.2',
        host: 'http://localhost:4242',
        id: '237c9ccf14e89a6e23fb15f2d9132efd98878f6267b9f128f603be3b3e362472',
        from: 'weaveworks/weave:1.2.0',
        inspectData: {
          Config: {
            ExposedPorts: {
              '6783/tcp': {},
              '6783/udp': {}
            }
          }
        }
      };
      RabbitMQ.publishContainerNetworkAttached(data);
      expect(RabbitMQ._publisher.publish.withArgs('container.network.attached')
        .calledOnce).to.be.true();
      expect(Object.keys(RabbitMQ._publisher.publish.args[0][1]))
        .to.contain(['id', 'inspectData', 'containerIp']);
      done();
    });
  }); // end publishContainerNetworkAttached

  describe('publishWeaveStart', function () {
    beforeEach(function (done) {
      RabbitMQ._publisher = {
        publish: sinon.stub()
      };
      done();
    });

    afterEach(function (done) {
      RabbitMQ._publisher = null;
      done();
    });

    it('should throw if missing data', function (done) {
      expect(function () {
        RabbitMQ.publishWeaveStart({});
      }).to.throw();

      done();
    });

    it('should publish _publisher', function (done) {
      RabbitMQ._publisher.publish.returns();
      var testArgs = {
        dockerUri: 'http://10.0.0.1:4242',
        orgId: 'runnable'
      };
      RabbitMQ.publishWeaveStart(testArgs);

      expect(RabbitMQ._publisher.publish
        .withArgs('weave.start', testArgs).called).to.be.true();
      done();
    });
  }); // end publishWeaveStart

  describe('publishWeavePeerForget', function () {
    beforeEach(function (done) {
      RabbitMQ._publisher = {
        publish: sinon.stub()
      };
      done();
    });

    afterEach(function (done) {
      RabbitMQ._publisher = null;
      done();
    });

    it('should throw if missing data', function (done) {
      expect(function () {
        RabbitMQ.publishWeavePeerForget();
      }).to.throw();

      done();
    });

    it('should publish _publisher', function (done) {
      RabbitMQ._publisher.publish.returns();
      var testArgs = {
        dockerHost: '10.0.0.1:4242',
        hostname: '10.0.0.99'
      };
      RabbitMQ.publishWeavePeerForget(testArgs);

      expect(RabbitMQ._publisher.publish
        .withArgs('weave.peer.forget', testArgs).called).to.be.true();
      done();
    });
  }); // end publishWeavePeerForget

  describe('publishWeavePeerRemove', function () {
    beforeEach(function (done) {
      RabbitMQ._publisher = {
        publish: sinon.stub()
      };
      done();
    });

    afterEach(function (done) {
      RabbitMQ._publisher = null;
      done();
    });

    it('should throw if missing data', function (done) {
      expect(function () {
        RabbitMQ.publishWeavePeerRemove();
      }).to.throw();

      done();
    });

    it('should publish _publisher', function (done) {
      RabbitMQ._publisher.publish.returns();
      var testArgs = {
        dockerHost: '10.0.0.1:4242',
        hostname: '10.0.0.99'
      };
      RabbitMQ.publishWeavePeerRemove(testArgs);

      expect(RabbitMQ._publisher.publish
        .withArgs('weave.peer.remove', testArgs).called).to.be.true();
      done();
    });
  }); // end publishWeavePeerRemove

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

  describe('publishOnDockUnhealthy', function () {
    beforeEach(function (done) {
      RabbitMQ._publisher = {
        publish: sinon.stub()
      };
      done();
    });

    it('should publish on-dock-unhealthy', function (done) {
      var testData = {
        host: 'testHost',
        githubId: 1253543
      };
      RabbitMQ._publisher.publish.returns();

      RabbitMQ.publishOnDockUnhealthy(testData);

      expect(RabbitMQ._publisher.publish
        .withArgs('on-dock-unhealthy').called).to.be.true();
      expect(RabbitMQ._publisher.publish
        .args[0][1].timestamp).to.exist();
      expect(RabbitMQ._publisher.publish
        .args[0][1].dockerHealthCheckId).to.exist();
      expect(RabbitMQ._publisher.publish
        .args[0][1].host).to.equal(testData.host);
      expect(RabbitMQ._publisher.publish
        .args[0][1].githubId).to.equal(testData.githubId);

      done();
    });

    it('should throw if missing keys', function (done) {
      var testData = {
        host: 'testHost',
        githubId: 1253543
      };

      Object.keys(testData).forEach(function (key) {
        var test = {
          host: 'testHost',
          githubId: 1253543
        };
        delete test[key];
        expect(function () {
          RabbitMQ.publishOnDockUnhealthy(test);
        }).to.throw();
      });

      done();
    });
  }); // end publishOnDockUnhealthy
}); // end rabbitmq.js unit test
