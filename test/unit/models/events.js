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

    it('should attach listener', function (done) {
      Redis.pubSub.on.returns();
      Events.listen();
      expect(Redis.pubSub.on.calledOnce).to.be.true();
      done();
    });
  }); // end listen

  describe('_handleDie', function () {
    beforeEach(function (done) {
      sinon.stub(process, 'exit');
      sinon.stub(Events, '_isWeaveContainer');
      sinon.stub(rollbar, 'handleErrorWithPayloadData');
      done();
    });

    afterEach(function (done) {
      process.exit.restore();
      Events._isWeaveContainer.restore();
      rollbar.handleErrorWithPayloadData.restore();
      done();
    });

    it('should exit if weave container', function (done) {
      var testData = {
        host: 'host'
      };
      Events._isWeaveContainer.returns(true);
      rollbar.handleErrorWithPayloadData.yields();

      Events._handleDie(testData);
      expect(process.exit.called).to.be.true();
      done();
    });

    it('should not exit if not weave container', function (done) {
      var testData = {
        host: 'host'
      };
      Events._isWeaveContainer.returns(false);
      rollbar.handleErrorWithPayloadData.yields();

      Events._handleDie(testData);
      expect(process.exit.called).to.be.false();
      done();
    });
  }); // end _handleDie

  describe('_isWeaveContainer', function () {
    it('should return true if correct container and host', function (done) {
      var testData = {
        from: process.env.WEAVE_CONTAINER_NAME,
        host: 'http://' + ip.address() + ':4242'
      };
      expect(Events._isWeaveContainer(testData))
        .to.be.true();
      done();
    });

    it('should return false if wrong container', function (done) {
      var testData = {
        from: 'wrong',
        host: 'http://' + ip.address() + ':4242'
      };
      expect(Events._isWeaveContainer(testData))
        .to.be.false();
      done();
    });

    it('should return false if wrong host', function (done) {
      var testData = {
        from: process.env.WEAVE_CONTAINER_NAME,
        host: 'non host'
      };
      expect(Events._isWeaveContainer(testData))
        .to.be.false();
      done();
    });

    it('should return false no from', function (done) {
      var testData = {
        host: 'non host'
      };
      expect(Events._isWeaveContainer(testData))
        .to.be.false();
      done();
    });

    it('should return false no host', function (done) {
      var testData = {
        from: process.env.WEAVE_CONTAINER_NAME,
      };
      expect(Events._isWeaveContainer(testData))
        .to.be.false();
      done();
    });

    it('should return false if no data', function (done) {
      expect(Events._isWeaveContainer(null))
        .to.be.false();
      done();
    });

    it('should return false if no data', function (done) {
      expect(Events._isWeaveContainer({}))
        .to.be.false();
      done();
    });
  }); // end _isWeaveContainer
}); // end events.js unit test
