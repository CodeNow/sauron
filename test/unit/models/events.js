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
var ErrorCat = require('error-cat');
var TaskError = require('ponos').TaskError;
var TaskFatalError = require('ponos').TaskFatalError;

var Events = require('../../../lib/models/events.js');
var Peers = require('../../../lib/models/peers.js');
var RabbitMQ = require('../../../lib/models/rabbitmq.js');
var WeaveWrapper = require('../../../lib/models/weave-wrapper.js');

describe('events.js unit test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_IMAGE_NAME = 'weaveworks/weave';
    done();
  });

  afterEach(function (done) {
    delete process.env.WEAVE_IMAGE_NAME;
    done();
  });

  describe('handleStart', function () {
    beforeEach(function (done) {
      sinon.stub(Peers, 'getList');
      sinon.stub(WeaveWrapper, 'launch');
      done();
    });

    afterEach(function (done) {
      Peers.getList.restore();
      WeaveWrapper.launch.restore();
      done();
    });

    it('should cb err if getList err', function (done) {
      Peers.getList.yieldsAsync('err');

      Events.handleStart({}, function (err) {
        expect(err).to.exist();
        done();
      });
    });

    it('should launch with no peers', function (done) {
      Peers.getList.yieldsAsync(null, [{
        dockerUri: 'http://10.0.0.1:4242'
      }]);
      WeaveWrapper.launch.yieldsAsync();

      Events.handleStart({
        dockerUri: 'http://10.0.0.1:4242'
      }, function (err) {
        expect(err).to.not.exist();
        expect(WeaveWrapper.launch.withArgs([], '10.0.0.1:4242').called)
          .to.be.true();
        done();
      });
    });

    it('should cb TaskFatalError if target no in peers', function (done) {
      Peers.getList.yieldsAsync(null, []);

      Events.handleStart({
        dockerUri: 'http://10.0.0.1:4242'
      }, function (err) {
        expect(err).to.be.an.instanceof(TaskFatalError);
        done();
      });
    });

    it('should launch with peers but not self', function (done) {
      Peers.getList.yieldsAsync(null, [{
        dockerUri: 'http://10.0.0.1:4242'
      }, {
        dockerUri: 'http://10.0.0.2:4242'
      }, {
        dockerUri: 'http://10.0.0.3:4242'
      }]);
      WeaveWrapper.launch.yieldsAsync();

      Events.handleStart({
        dockerUri: 'http://10.0.0.1:4242'
      }, function (err) {
        expect(err).to.not.exist();
        expect(WeaveWrapper.launch.withArgs(['10.0.0.2', '10.0.0.3'], '10.0.0.1:4242').called)
          .to.be.true();
        done();
      });
    });

  }); // end handleStart

  describe('handleDied', function () {
    beforeEach(function (done) {
      sinon.stub(Events, '_isWeaveContainer');
      sinon.stub(RabbitMQ, 'publishWeaveStart');
      done();
    });

    afterEach(function (done) {
      Events._isWeaveContainer.restore();
      RabbitMQ.publishWeaveStart.restore();
      done();
    });

    it('should publish start if weave container', function (done) {
      Events._isWeaveContainer.returns(true);
      RabbitMQ.publishWeaveStart.returns();

      Events.handleDied({
        host: 'ras',
        tags: 'tag,me'
      });

      expect(RabbitMQ.publishWeaveStart.calledOnce)
        .to.be.true();
      done();
    });

    it('should not publish start', function (done) {
      Events._isWeaveContainer.returns(false);

      Events.handleDied();

      expect(RabbitMQ.publishWeaveStart.calledOnce)
        .to.be.false();
      done();
    });
  }); // end handleDied

  describe('handleStarted', function () {
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

      Events.handleStarted({}, function (err) {
        expect(err).to.not.exist();
        expect(WeaveWrapper.attach.called).to.be.false();
        done();
      });
    });

    it('should cb TaskError if 500', function (done) {
      var testErr = ErrorCat.create(500, 'Dunlendings');
      var testHost = '172.123.12.3';
      var testId = '23984765893264';

      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(testErr);
      RabbitMQ.publishContainerNetworkAttachFailed.returns();

      Events.handleStarted({
        id: testId,
        host: testHost,
        inspectData: {
          Config: {
            Labels: {
              instanceId: '5633e9273e2b5b0c0077fd41',
              contextVersionId: '563a808f9359ef0c00df34e6'
            }
          }
        }
      }, function (err) {
        expect(err).to.be.an.instanceof(TaskError);
        done();
      });
    });

    it('should publish on non 500 error', function (done) {
      var testErr = ErrorCat.create(409, 'Dunlendings');
      var testHost = '172.123.12.3';
      var testId = '23984765893264';

      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(testErr);
      RabbitMQ.publishContainerNetworkAttachFailed.returns();
      var jobData = {
        id: testId,
        host: testHost,
        inspectData: {
          Config: {
            Labels: {
              instanceId: '5633e9273e2b5b0c0077fd41',
              contextVersionId: '563a808f9359ef0c00df34e6'
            }
          }
        }
      };
      Events.handleStarted(jobData, function (err) {
        expect(err).to.not.exist();
        expect(RabbitMQ.publishContainerNetworkAttached.called).to.be.false();
        jobData.err = testErr;
        expect(RabbitMQ.publishContainerNetworkAttachFailed.withArgs(jobData).called).to.be.true();
        done();
      });
    });

    it('should publish correct data', function (done) {
      var testIp = '10.0.0.0';
      var testHost = 'http://172.123.12.3:4242';
      var testId = '23984765893264';
      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(null, testIp);
      RabbitMQ.publishContainerNetworkAttached.returns();
      var jobData = {
        id: testId,
        host: testHost,
        inspectData: {
          Config: {
            Labels: {
              instanceId: '5633e9273e2b5b0c0077fd41',
              contextVersionId: '563a808f9359ef0c00df34e6'
            }
          }
        }
      };
      Events.handleStarted(jobData, function (err) {
        expect(err).to.not.exist();
        jobData.containerIp = testIp;
        expect(RabbitMQ.publishContainerNetworkAttached
          .withArgs(jobData).called).to.be.true();
        expect(WeaveWrapper.attach.withArgs(testId, '172.123.12.3:4242').called)
          .to.be.true();
        done();
      });
    });
  }); // end handleStarted

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
    beforeEach(function (done) {
      process.env.NETWORK_BLACKLIST = 'weave,swarm';
      done();
    });

    afterEach(function (done) {
      delete process.env.NETWORK_BLACKLIST;
      done();
    });

    it('should return false if on blacklist', function (done) {
      ['weave', 'zetto/weave', 'weaveworks/exec', 'aswarm', 'swarm:1.2.2']
      .forEach(function (item) {
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
        from: 'good',
      };
      expect(Events._isNetworkNeeded(testData))
        .to.be.true();
      done();
    });
  }); // end _isNetworkNeeded

  describe('validateContainerJob', function () {
    it('should return false if no id', function (done) {
      var testData = {};
      expect(Events.validateContainerJob(testData))
        .to.be.false();
      done();
    });

    it('should return false if missing host', function (done) {
      var testData = {
        id: '12352524',
      };
      expect(Events.validateContainerJob(testData))
        .to.be.false();
      done();
    });

    it('should return false if no from', function (done) {
      var testData = {
        id: '12352524',
        host: 'http://localhost:4242',
      };
      expect(Events.validateContainerJob(testData))
        .to.be.false();
      done();
    });

    it('should return false if no tag', function (done) {
      var testData = {
        id: '12352524',
        host: 'http://localhost:4242',
        from: 'something',
      };
      expect(Events.validateContainerJob(testData))
        .to.be.false();
      done();
    });

    it('should return true', function (done) {
      var testData = {
        id: '12352524',
        host: 'http://localhost:4242',
        from: 'something',
        tags: 'me,you,myDogBlue'
      };
      expect(Events.validateContainerJob(testData))
        .to.be.true();
      done();
    });
  }); // end validateContainerJob

  describe('validateDockerJob', function () {
    it('should return false if no tag or host', function (done) {
      var testData = {};
      expect(Events.validateDockerJob(testData))
        .to.be.false();
      done();
    });

    it('should return false if missing tag', function (done) {
      var testData = {
        host: 'http://localhost:4242',
      };
      expect(Events.validateDockerJob(testData))
        .to.be.false();
      done();
    });

    it('should return false if missing host', function (done) {
      var testData = {
        tags: 'me,you,myDogBlue'
      };
      expect(Events.validateDockerJob(testData))
        .to.be.false();
      done();
    });

    it('should return true', function (done) {
      var testData = {
        host: 'http://localhost:4242',
        tags: 'me,you,myDogBlue'
      };
      expect(Events.validateDockerJob(testData))
        .to.be.true();
      done();
    });
  }); // end validateDockerJob
}); // end events.js unit test
