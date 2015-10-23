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
var rollbar = require('rollbar');

var Redis = require('../../../lib/models/redis.js');
var WeaveWrapper = require('../../../lib/models/weave-wrapper.js');
var RabbitMq = require('../../../lib/models/rabbitmq.js');
var Events = require('../../../lib/models/events.js');

describe('events.js unit test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_CONTAINER_NAME = 'weaveworks/weave:1.1.2';
    done();
  });

  afterEach(function (done) {
    delete process.env.WEAVE_CONTAINER_NAME;
    done();
  });

  describe('listen', function () {
    beforeEach(function (done) {
      Redis.pubSub = {
        on: sinon.stub()
      };
      done();
    });

    it('should attach listeners', function (done) {
      Redis.pubSub.on.returns();
      Events.listen();
      expect(Redis.pubSub.on.calledTwice).to.be.true();
      done();
    });
  }); // end listen

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
      sinon.stub(Events, '_thisHost');
      sinon.stub(rollbar, 'handleErrorWithPayloadData');
      done();
    });

    afterEach(function (done) {
      process.exit.restore();
      Events._isWeaveContainer.restore();
      Events._thisHost.restore();
      rollbar.handleErrorWithPayloadData.restore();
      done();
    });

    it('should exit if weave container', function (done) {
      Events._isWeaveContainer.returns(true);
      Events._thisHost.returns(true);
      rollbar.handleErrorWithPayloadData.yields();

      Events._handleDie({});
      expect(process.exit.called).to.be.true();
      done();
    });

    it('should fail if not host', function (done) {
      Events._thisHost.returns(false);
      rollbar.handleErrorWithPayloadData.yields();

      Events._handleDie({});
      expect(process.exit.called).to.be.false();
      done();
    });

    it('should not exit if empty object', function (done) {
      Events._thisHost.returns(true);
      Events._isWeaveContainer.returns(false);
      rollbar.handleErrorWithPayloadData.yields();

      Events._handleDie({});
      expect(process.exit.called).to.be.false();
      done();
    });

    it('should not exit if no data', function (done) {
      Events._handleDie(null);
      expect(process.exit.called).to.be.false();
      done();
    });
  }); // end _handleDie

  describe('_handleStart', function () {
    beforeEach(function (done) {
      sinon.stub(RabbitMq, 'publishContainerNetworkAttached');
      sinon.stub(Events, '_idNetworkNeeded');
      sinon.stub(Events, '_thisHost');
      sinon.stub(WeaveWrapper, 'attach');
      done();
    });

    afterEach(function (done) {
      RabbitMq.publishContainerNetworkAttached.restore();
      Events._idNetworkNeeded.restore();
      Events._thisHost.restore();
      WeaveWrapper.attach.restore();
      done();
    });

    it('should not attach if invalid data', function (done) {
      Events._handleStart(null);
      expect(WeaveWrapper.attach.called).to.be.false();
      done();
    });

    it('should not attach if not host', function (done) {
      Events._thisHost.returns(false);

      Events._handleStart({});
      expect(WeaveWrapper.attach.called).to.be.false();
      done();
    });

    it('should not attach if network not needed', function (done) {
      Events._thisHost.returns(true);
      Events._idNetworkNeeded.returns(false);

      Events._handleStart({});
      expect(WeaveWrapper.attach.called).to.be.false();
      done();
    });

    it('should not publish if attach failed', function (done) {
      Events._thisHost.returns(true);
      Events._idNetworkNeeded.returns(true);
      WeaveWrapper.attach.yieldsAsync('Dunlendings');

      Events._handleStart({});
      expect(RabbitMq.publishContainerNetworkAttached.called).to.be.false();
      done();
    });

    it('should publish correct data', function (done) {
      var testFrom = 'ubuntu';
      var testIp = '10.0.0.0';
      Events._thisHost.returns(true);
      Events._idNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(null, testIp);

      Events._handleStart({ from: testFrom });
      expect(RabbitMq.publishContainerNetworkAttached.withArgs({
        containerId: testFrom,
        containerIp: testIp
      }).called).to.be.true();
      done();
    });
  }); // end _handleStart

  describe('_isWeaveContainer', function () {
    it('should return true if correct container', function (done) {
      var testData = {
        from: process.env.WEAVE_CONTAINER_NAME,
      };
      expect(Events._isWeaveContainer(testData))
        .to.be.true();
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

  describe('_idNetworkNeeded', function () {
    it('should return false if weave container', function (done) {
      ['weave', 'zetto/weave', 'weaveworks/exec'].forEach(function (item) {
        var testData = {
          from: item,
        };
        expect(Events._idNetworkNeeded(testData))
          .to.be.false();
      });
      done();
    });

    it('should return true if not filtered', function (done) {
      var testData = {
        from: 'wrong',
      };
      expect(Events._idNetworkNeeded(testData))
        .to.be.true();
      done();
    });

    it('should return false no from', function (done) {
      expect(Events._idNetworkNeeded({}))
        .to.be.false();
      done();
    });
  }); // end _idNetworkNeeded

  describe('_thisHost', function() {
    it('should return true', function (done) {
      var testData = {
        host: 'http://' + ip.address() + ':4242'
      };
      expect(Events._thisHost(testData))
        .to.be.true();
      done();
    });

    it('should return false if wrong host', function (done) {
      var testData = {
        host: 'non host'
      };
      expect(Events._thisHost(testData))
        .to.be.false();
      done();
    });

    it('should return false no host', function (done) {
      expect(Events._thisHost({}))
        .to.be.false();
      done();
    });
  }); // end _thisHost
}); // end events.js unit test
