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


  describe('handleDockRemoved', function () {
    beforeEach(function (done) {
      sinon.stub(Peers, 'getList');
      sinon.stub(RabbitMQ, 'publishWeavePeerForget').returns();
      sinon.stub(RabbitMQ, 'publishWeavePeerRemove').returns();
      done();
    });

    afterEach(function (done) {
      Peers.getList.restore();
      RabbitMQ.publishWeavePeerForget.restore();
      RabbitMQ.publishWeavePeerRemove.restore();
      done();
    });

    it('should cb err if getList err', function (done) {
      Peers.getList.yieldsAsync('err');

      Events.handleDockRemoved({}, function (err) {
        expect(err).to.exist();
        done();
      });
    });

    it('should do nothing if no peers', function (done) {
      Peers.getList.yieldsAsync(null, []);

      Events.handleDockRemoved({
        host: 'http://10.0.0.1:4242',
        githubId: '11213123'
      }, function (err) {
        expect(err).to.not.exist();
        expect(RabbitMQ.publishWeavePeerForget.called)
          .to.be.false();
        expect(RabbitMQ.publishWeavePeerRemove.called)
          .to.be.false();
        done();
      });
    });

    it('should publish two jobs for each peer for each peer', function (done) {
      Peers.getList.yieldsAsync(null, [{
        dockerUri: 'http://10.0.0.1:4242'
      }, {
        dockerUri: 'http://10.0.0.2:4242'
      }, {
        dockerUri: 'http://10.0.0.3:4242'
      }]);

      Events.handleDockRemoved({
        host: 'http://10.0.0.1:4242',
        githubId: '11213123'
      }, function (err) {
        expect(err).to.not.exist();
        expect(RabbitMQ.publishWeavePeerForget.callCount).to.equal(3);
        expect(RabbitMQ.publishWeavePeerForget.getCall(0).args[0]).to.deep.equal({
          dockerHost: '10.0.0.1:4242',
          hostname: '10.0.0.1'
        });
        expect(RabbitMQ.publishWeavePeerForget.getCall(1).args[0]).to.deep.equal({
          dockerHost: '10.0.0.2:4242',
          hostname: '10.0.0.1'
        });
        expect(RabbitMQ.publishWeavePeerForget.getCall(2).args[0]).to.deep.equal({
          dockerHost: '10.0.0.3:4242',
          hostname: '10.0.0.1'
        });
        expect(RabbitMQ.publishWeavePeerRemove.callCount).to.equal(3);
        expect(RabbitMQ.publishWeavePeerRemove.getCall(0).args[0]).to.deep.equal({
          dockerHost: '10.0.0.1:4242',
          hostname: '10.0.0.1'
        });
        expect(RabbitMQ.publishWeavePeerRemove.getCall(1).args[0]).to.deep.equal({
          dockerHost: '10.0.0.2:4242',
          hostname: '10.0.0.1'
        });
        expect(RabbitMQ.publishWeavePeerRemove.getCall(2).args[0]).to.deep.equal({
          dockerHost: '10.0.0.3:4242',
          hostname: '10.0.0.1'
        });
        done();
      });
    });
  }); // end handleDockRemoved

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
      sinon.stub(Events, '_isNetworkNeeded');
      sinon.stub(WeaveWrapper, 'attach');
      sinon.stub(Peers, 'doesDockExist');
      done();
    });

    afterEach(function (done) {
      RabbitMQ.publishContainerNetworkAttached.restore();
      Events._isNetworkNeeded.restore();
      WeaveWrapper.attach.restore();
      Peers.doesDockExist.restore();
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

    it('should cb TaskError if doesDockExist failed', function (done) {
      var testErr = ErrorCat.create(500, 'Dunlendings');
      var testHost = '172.123.12.3';
      var testId = '23984765893264';

      Events._isNetworkNeeded.returns(true);
      Peers.doesDockExist.yieldsAsync(testErr);
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
        },
        tags: '1q2qswedasdasdad,123'
      }, function (err) {
        expect(err).to.be.an.instanceof(TaskError);
        sinon.assert.notCalled(RabbitMQ.publishContainerNetworkAttached);
        sinon.assert.notCalled(WeaveWrapper.attach);
        done();
      });
    });

    it('should cb TaskFatalError if dock does not exist', function (done) {
      var testHost = '172.123.12.3';
      var testId = '23984765893264';

      Events._isNetworkNeeded.returns(true);
      Peers.doesDockExist.yieldsAsync(null, false);
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
        },
        tags: '1q2qswedasdasdad,123'
      }, function (err) {
        expect(err).to.be.an.instanceof(TaskError);
        done();
      });
    });

    it('should cb TaskError if attach 500', function (done) {
      var testErr = ErrorCat.create(500, 'Dunlendings');
      var testHost = '172.123.12.3';
      var testId = '23984765893264';

      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(testErr);
      Peers.doesDockExist.yieldsAsync(null, true);
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
        },
        tags: '1q2qswedasdasdad,123'
      }, function (err) {
        expect(err).to.be.an.instanceof(TaskError);
        done();
      });
    });

    it('should fail if error 409', function (done) {
      var testErr = ErrorCat.create(409, 'Dunlendings');
      var testHost = '172.123.12.3';
      var testId = '23984765893264';
      var orgId = '868976908769078';

      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(testErr);
      Peers.doesDockExist.yieldsAsync(null, true);
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
        },
        tags: orgId + ',1q2qswedasdasdad,123'
      };
      Events.handleStarted(jobData, function (err) {
        expect(err).to.be.an.instanceof(TaskFatalError);
        expect(err.report).to.be.false()
        sinon.assert.calledWith(WeaveWrapper.attach, testId, null, orgId, sinon.match.func);
        expect(RabbitMQ.publishContainerNetworkAttached.called).to.be.false();
        done();
      });
    });

    it('should publish on attach non 500 and non 409 error', function (done) {
      var testErr = ErrorCat.create(403, 'Dunlendings');
      var testHost = '172.123.12.3';
      var testId = '23984765893264';
      var orgId = '868976908769078';

      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(testErr);
      Peers.doesDockExist.yieldsAsync(null, true);
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
        },
        tags: orgId + ',1q2qswedasdasdad,123'
      };
      Events.handleStarted(jobData, function (err) {
        expect(err).to.not.exist();
        sinon.assert.calledWith(WeaveWrapper.attach, testId, null, orgId, sinon.match.func);
        expect(RabbitMQ.publishContainerNetworkAttached.called).to.be.false();
        done();
      });
    });

    it('should publish correct data', function (done) {
      var testIp = '10.0.0.0';
      var testHost = 'http://172.123.12.3:4242';
      var testId = '23984765893264';
      var orgId = '868976908769078';
      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(null, testIp);
      RabbitMQ.publishContainerNetworkAttached.returns();
      Peers.doesDockExist.yieldsAsync(null, true);
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
        },
        tags: orgId + ',1q2qswedasdasdad,123'
      };

      Events.handleStarted(jobData, function (err) {
        expect(err).to.not.exist();
        jobData.containerIp = testIp;
        expect(RabbitMQ.publishContainerNetworkAttached
          .withArgs(jobData).called).to.be.true();
        sinon.assert.calledOnce(WeaveWrapper.attach);
        sinon.assert.calledWith(WeaveWrapper.attach, testId, '172.123.12.3:4242', orgId, sinon.match.func);
        sinon.assert.calledWith(
          Peers.doesDockExist,
          testHost
        );
        done();
      });
    });

    it('should cb error if publish threw', function (done) {
      var testIp = '10.0.0.0';
      var testHost = 'http://172.123.12.3:4242';
      var testId = '23984765893264';
      var orgId = '868976908769078';
      var testErr = new Error('shadowflax');
      Events._isNetworkNeeded.returns(true);
      WeaveWrapper.attach.yields(null, testIp);
      RabbitMQ.publishContainerNetworkAttached.throws(testErr);
      Peers.doesDockExist.yieldsAsync(null, true);
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
        },
        tags: orgId + ',1q2qswedasdasdad,123'
      };

      Events.handleStarted(jobData, function (err) {
        expect(err).to.deep.equals(testErr);
        jobData.containerIp = testIp;
        expect(RabbitMQ.publishContainerNetworkAttached
          .withArgs(jobData).called).to.be.true();
        sinon.assert.calledOnce(WeaveWrapper.attach);
        sinon.assert.calledWith(WeaveWrapper.attach, testId, '172.123.12.3:4242', orgId, sinon.match.func);
        sinon.assert.calledWith(
          Peers.doesDockExist,
          testHost
        );
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
