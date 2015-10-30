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
var ip = require('ip');
var ErrorCat = require('error-cat');

var Redis = require('../../../lib/models/redis.js');
var WeaveWrapper = require('../../../lib/models/weave-wrapper.js');
var RabbitMQ = require('../../../lib/models/rabbitmq.js');
var Events = require('../../../lib/models/events.js');

describe('events.js unit test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_IMAGE_NAME = 'weaveworks/weave:1.2.0';
    done();
  });

  afterEach(function (done) {
    delete process.env.WEAVE_IMAGE_NAME;
    done();
  });

  describe('listen', function () {
    beforeEach(function (done) {
      Redis.pubSub = {
        subscribe: sinon.stub(),
        on: sinon.stub()
      };
      done();
    });

    it('should listeners', function (done) {
      Redis.pubSub.subscribe.returns();
      Redis.pubSub.on.returns();

      Events.listen();

      expect(Redis.pubSub.subscribe.calledTwice).to.be.true();
      expect(Redis.pubSub.on.calledOnce).to.be.true();
      done();
    });
  }); // end listen

  describe('_domainRun', function () {
    beforeEach(function (done) {
      sinon.stub(Events, '_handleEvent');
      sinon.stub(ErrorCat.prototype, 'createAndReport');
      done();
    });

    afterEach(function (done) {
      Events._handleEvent.restore();
      ErrorCat.prototype.createAndReport.restore();
      done();
    });

    it('should run event handler', function (done) {
      var testChannel = 'some chan';
      var testData = 'some dat';
      Events._handleEvent.restore();

      sinon.stub(Events, '_handleEvent', function (channel, data) {
        expect(channel).to.equal(testChannel);
        expect(data).to.equal(testData);
        done();
      });

      Events._domainRun(testChannel, testData);
    });

    it('should catch thrown error', function (done) {
      ErrorCat.prototype.createAndReport.restore();
      sinon.stub(ErrorCat.prototype, 'createAndReport', function (code) {
        expect(code).to.equal(500);
        done();
      });
      Events._handleEvent.throws(new Error('Ungoliant'));

      Events._domainRun();
    });
  }); // end _domainRun

  describe('stop', function () {
    beforeEach(function (done) {
      Redis.pubSub = {
        removeAllListeners: sinon.stub()
      };
      done();
    });

    it('should remove listeners', function (done) {
      Redis.pubSub.removeAllListeners.returns();

      Events.stop();

      expect(Redis.pubSub.removeAllListeners.calledTwice).to.be.true();
      done();
    });
  }); // end stop

  describe('_handleDie', function () {
    beforeEach(function (done) {
      sinon.stub(process, 'exit');
      sinon.stub(Events, '_isWeaveContainer');
      sinon.stub(ErrorCat.prototype, 'createAndReport');
      done();
    });

    afterEach(function (done) {
      process.exit.restore();
      Events._isWeaveContainer.restore();
      ErrorCat.prototype.createAndReport.restore();
      done();
    });

    it('should exit if weave container', function (done) {
      Events._isWeaveContainer.returns(true);
      ErrorCat.prototype.createAndReport.returns();

      Events._handleDie({});
      expect(process.exit.called).to.be.true();
      done();
    });

    it('should fail if _isWeaveContainer returns false', function (done) {
      Events._isWeaveContainer.returns(false);
      ErrorCat.prototype.createAndReport.returns();

      Events._handleDie({});
      expect(process.exit.called).to.be.false();
      done();
    });
  }); // end _handleDie

  describe('_handleStart', function () {
    beforeEach(function (done) {
      sinon.stub(RabbitMQ, 'publishContainerNetworkAttached');
      sinon.stub(RabbitMQ, 'publishContainerNetworkAttachFailed');
      sinon.stub(Events, '_isNetworkNeeded');
      sinon.stub(WeaveWrapper, 'attach');
      done();
    });

    afterEach(function (done) {
      RabbitMQ.publishContainerNetworkAttached.restore();
      RabbitMQ.publishContainerNetworkAttachFailed.restore();
      Events._isNetworkNeeded.restore();
      WeaveWrapper.attach.restore();
      done();
    });

    it('should not attach if network not needed', function (done) {
      Events._isNetworkNeeded.returns(false);

      Events._handleStart({});

      expect(WeaveWrapper.attach.called).to.be.false();
      done();
    });

    it('should publish attach failed', function (done) {
      var testErr = ErrorCat.create(500, 'Dunlendings');
      var testHost = '172.123.12.3';
      var testId = '23984765893264';

      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(testErr);
      RabbitMQ.publishContainerNetworkAttachFailed.returns();

      Events._handleStart({
        id: testId,
        host: testHost
      });

      expect(RabbitMQ.publishContainerNetworkAttached.called).to.be.false();
      expect(RabbitMQ.publishContainerNetworkAttachFailed.withArgs({
        containerId: testId,
        host: testHost,
        err : testErr
      }).called).to.be.true();
      done();
    });

    it('should not publish if 409 attach failed', function (done) {
      var testErr = ErrorCat.create(409, 'Dunlendings');
      var testHost = '172.123.12.3';
      var testId = '23984765893264';

      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(testErr);
      RabbitMQ.publishContainerNetworkAttachFailed.returns();

      Events._handleStart({
        id: testId,
        host: testHost
      });

      expect(RabbitMQ.publishContainerNetworkAttached.called).to.be.false();
      expect(RabbitMQ.publishContainerNetworkAttachFailed.called).to.be.false();
      done();
    });

    it('should publish correct data', function (done) {
      var testIp = '10.0.0.0';
      var testHost = '172.123.12.3';
      var testId = '23984765893264';
      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(null, testIp);
      RabbitMQ.publishContainerNetworkAttached.returns();

      Events._handleStart({
        id: testId,
        host: testHost
      });

      expect(RabbitMQ.publishContainerNetworkAttached.withArgs({
        containerId: testId,
        containerIp: testIp,
        host: testHost
      }).called).to.be.true();
      done();
    });
  }); // end _handleStart

  describe('_isWeaveContainer', function () {
    it('should return true if correct container', function (done) {
      var testData = {
        from: process.env.WEAVE_IMAGE_NAME,
        inspectData: {
          Config: {
            ExposedPorts: {
              '6783/tcp': {},
              '6783/udp': {}
            }
          }
        }
      };

      expect(Events._isWeaveContainer(testData))
        .to.be.true();
      done();
    });

    it('should return false if wrong container', function (done) {
      var testData = {
        from: process.env.WEAVE_IMAGE_NAME,
        inspectData: {
          Config: {
            ExposedPorts: null
          }
        }
      };

      expect(Events._isWeaveContainer(testData))
        .to.be.false();
      done();
    });

    it('should return false if wrong container', function (done) {
      var testData = {
        from: process.env.WEAVE_IMAGE_NAME,
        inspectData: {}
      };

      expect(Events._isWeaveContainer(testData))
        .to.be.false();
      done();
    });

    it('should return false if wrong container', function (done) {
      var testData = {
        from: 'wrong',
      };
      expect(Events._isWeaveContainer(testData))
        .to.be.false();
      done();
    });

    it('should return false no from', function (done) {
      expect(Events._isWeaveContainer({}))
        .to.be.false();
      done();
    });
  }); // end _isWeaveContainer

  describe('_isNetworkNeeded', function () {
    it('should return false no from', function (done) {
      expect(Events._isNetworkNeeded({}))
        .to.be.false();
      done();
    });

    it('should return false if weave container', function (done) {
      ['weave', 'zetto/weave', 'weaveworks/exec'].forEach(function (item) {
        var testData = {
          from: item,
        };
        expect(Events._isNetworkNeeded(testData))
          .to.be.false();
      });
      done();
    });

    it('should return true', function (done) {
      var testData = {
        from: 'wrong',
      };
      expect(Events._isNetworkNeeded(testData))
        .to.be.true();
      done();
    });
  }); // end _isNetworkNeeded

  describe('_validate', function () {
    it('should return false if no id', function (done) {
      var testData = {};
      expect(Events._validate(testData))
        .to.be.false();
      done();
    });

    it('should return false if missing host', function (done) {
      var testData = {
        id: '12352524',
      };
      expect(Events._validate(testData))
        .to.be.false();
      done();
    });

    it('should return false if wrong host', function (done) {
      var testData = {
        id: '12352524',
        host: 'not host'
      };
      expect(Events._validate(testData))
        .to.be.false();
      done();
    });

    it('should return true', function (done) {
      var testData = {
        id: '12352524',
        host: 'http://' + ip.address() + ':4242'
      };
      expect(Events._validate(testData))
        .to.be.true();
      done();
    });
  }); // end _validate

  describe('_handleEvent', function () {
    beforeEach(function (done) {
      sinon.stub(Events, '_validate');
      sinon.stub(Events, '_handleDie');
      sinon.stub(Events, '_handleStart');
      done();
    });

    afterEach(function (done) {
      Events._validate.restore();
      Events._handleDie.restore();
      Events._handleStart.restore();
      done();
    });

    it('should throw invalid data', function (done) {
      expect(function () {
        Events._handleEvent('');
      }).to.be.throw(Error);
      done();
    });

    it('should return if invalid data', function (done) {
      Events._validate.returns(false);

      Events._handleEvent(null, JSON.stringify({ test: 1 }));

      expect(Events._handleDie.called).to.be.false();
      expect(Events._handleStart.called).to.be.false();
      done();
    });

    it('should handle die if die event', function (done) {
      Events._validate.returns(true);

      Events._handleEvent('runnable:docker:events:die',
        JSON.stringify({ test: 1 }));

      expect(Events._handleDie.called).to.be.true();
      expect(Events._handleStart.called).to.be.false();
      done();
    });

    it('should handle start if start event', function (done) {
      Events._validate.returns(true);

      Events._handleEvent('runnable:docker:events:start',
        JSON.stringify({ test: 1 }));

      expect(Events._handleDie.called).to.be.false();
      expect(Events._handleStart.called).to.be.true();
      done();
    });

    it('should call nothing if other event', function (done) {
      Events._validate.returns(true);

      Events._handleEvent('runnable:docker:events:other',
        JSON.stringify({ test: 1 }));

      expect(Events._handleDie.called).to.be.false();
      expect(Events._handleStart.called).to.be.false();
      done();
    });
  }); // end _handleEvent
}); // end events.js unit test
