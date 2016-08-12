'use strict'
require('loadenv')()

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const Code = require('code')
const expect = Code.expect

const BaseError = require('error-cat/errors/base-error')
const Promise = require('bluebird')
const sinon = require('sinon')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const WorkerError = require('error-cat/errors/worker-error')

const Docker = require('../../../lib/models/docker.js')
const Events = require('../../../lib/models/events.js')
const FailedAttach = require('../../../lib/errors/failed-attach.js')
const InvalidArgument = require('../../../lib/errors/invalid-argument.js')
const RabbitMQ = require('../../../lib/models/rabbitmq.js')
const WeaveError = require('../../../lib/errors/weave-error.js')
const WeaveWrapper = require('../../../lib/models/weave-wrapper.js')

require('sinon-as-promised')(Promise)

describe('events.js unit test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_IMAGE_NAME = 'weaveworks/weave'
    done()
  })

  afterEach(function (done) {
    delete process.env.WEAVE_IMAGE_NAME
    done()
  })

  describe('handleStart', function () {
    beforeEach(function (done) {
      sinon.stub(Docker, 'findDocksByOrgId')
      sinon.stub(WeaveWrapper, 'launch')
      done()
    })

    afterEach(function (done) {
      Docker.findDocksByOrgId.restore()
      WeaveWrapper.launch.restore()
      done()
    })

    it('should cb err if findDocksByOrgId err', function (done) {
      Docker.findDocksByOrgId.yieldsAsync('err')

      Events.handleStart({}, function (err) {
        expect(err).to.exist()
        done()
      })
    })

    it('should launch with no peers', function (done) {
      Docker.findDocksByOrgId.yieldsAsync(null, [{
        Host: '10.0.0.1:4242'
      }])
      WeaveWrapper.launch.yieldsAsync()

      Events.handleStart({
        dockerUri: 'http://10.0.0.1:4242'
      }, function (err) {
        expect(err).to.not.exist()
        expect(WeaveWrapper.launch.withArgs([], '10.0.0.1:4242').called)
          .to.be.true()
        done()
      })
    })

    it('should cb WorkerStopError if target no in peers', function (done) {
      Docker.findDocksByOrgId.yieldsAsync(null, [])

      Events.handleStart({
        dockerUri: 'http://10.0.0.1:4242'
      }, function (err) {
        expect(err).to.be.an.instanceof(WorkerStopError)
        done()
      })
    })

    it('should launch with peers but not self', function (done) {
      Docker.findDocksByOrgId.yieldsAsync(null, [{
        Host: '10.0.0.1:4242'
      }, {
        Host: '10.0.0.2:4242'
      }, {
        Host: '10.0.0.3:4242'
      }])
      WeaveWrapper.launch.yieldsAsync()

      Events.handleStart({
        dockerUri: 'http://10.0.0.1:4242'
      }, function (err) {
        expect(err).to.not.exist()
        expect(WeaveWrapper.launch.withArgs(['10.0.0.2', '10.0.0.3'], '10.0.0.1:4242').called)
          .to.be.true()
        done()
      })
    })
  })

  describe('_removeWeavePeer', function () {
    beforeEach(function (done) {
      sinon.stub(Docker, 'findLightestOrgDock').yieldsAsync(null, {
        Host: '10.0.0.1:4242'
      })
      sinon.stub(RabbitMQ, 'publishWeavePeerRemove').returns()
      done()
    })

    afterEach(function (done) {
      Docker.findLightestOrgDock.restore()
      RabbitMQ.publishWeavePeerRemove.restore()
      done()
    })

    it('should publish new job to remove weave peer', function (done) {
      Events._removeWeavePeer('10.0.0.4', '12981', function (err) {
        expect(err).to.not.exist()
        sinon.assert.calledOnce(RabbitMQ.publishWeavePeerRemove)
        sinon.assert.calledWith(RabbitMQ.publishWeavePeerRemove, {
          dockerHost: '10.0.0.1:4242',
          hostname: '10.0.0.4',
          orgId: '12981'
        })
        done()
      })
    })

    it('should cb with fatal error if no dock was found', function (done) {
      Docker.findLightestOrgDock.yieldsAsync(null, null)
      Events._removeWeavePeer('10.0.0.4', '12981', function (err) {
        expect(err).to.exist()
        expect(err).to.be.an.instanceof(WorkerStopError)
        expect(err.message).to.equal('No docks left for an org')
        sinon.assert.notCalled(RabbitMQ.publishWeavePeerRemove)
        done()
      })
    })

    it('should cb with fatal error if dockHost was not found', function (done) {
      Docker.findLightestOrgDock.yieldsAsync(null, {
        Host: null
      })
      Events._removeWeavePeer('10.0.0.4', '12981', function (err) {
        expect(err).to.exist()
        expect(err).to.be.an.instanceof(WorkerStopError)
        expect(err.message).to.equal('Dock has not host data')
        sinon.assert.notCalled(RabbitMQ.publishWeavePeerRemove)
        done()
      })
    })

    it('should cb with error if finding dock failed', function (done) {
      var swarmError = new Error('Swarm error')
      Docker.findLightestOrgDock.yieldsAsync(swarmError)
      Events._removeWeavePeer('10.0.0.4', '12981', function (err) {
        expect(err).to.exist()
        expect(err).to.equal(swarmError)
        sinon.assert.notCalled(RabbitMQ.publishWeavePeerRemove)
        done()
      })
    })
  })

  describe('_forgetWeavePeer', function () {
    beforeEach(function (done) {
      sinon.stub(Docker, 'findDocksByOrgId').yieldsAsync(null, [{
        Host: '10.0.0.1:4242'
      }, {
        Host: '10.0.0.2:4242'
      }, {
        Host: '10.0.0.3:4242'
      }])
      sinon.stub(RabbitMQ, 'publishWeavePeerForget').returns()
      done()
    })
    afterEach(function (done) {
      Docker.findDocksByOrgId.restore()
      RabbitMQ.publishWeavePeerForget.restore()
      done()
    })
    it('should publish new job to forget weave peer', function (done) {
      Events._forgetWeavePeer('10.0.0.4', '12981', function (err) {
        expect(err).to.not.exist()
        expect(RabbitMQ.publishWeavePeerForget.callCount).to.equal(3)
        expect(RabbitMQ.publishWeavePeerForget.getCall(0).args[0]).to.equal({
          dockerHost: '10.0.0.1:4242',
          hostname: '10.0.0.4'
        })
        expect(RabbitMQ.publishWeavePeerForget.getCall(1).args[0]).to.equal({
          dockerHost: '10.0.0.2:4242',
          hostname: '10.0.0.4'
        })
        expect(RabbitMQ.publishWeavePeerForget.getCall(2).args[0]).to.equal({
          dockerHost: '10.0.0.3:4242',
          hostname: '10.0.0.4'
        })
        done()
      })
    })
    it('should publish nothing if no peers were found', function (done) {
      Docker.findDocksByOrgId.yieldsAsync(null, [])
      Events._forgetWeavePeer('10.0.0.4', '12981', function (err) {
        expect(err).to.not.exist()
        sinon.assert.notCalled(RabbitMQ.publishWeavePeerForget)
        done()
      })
    })
    it('should cb with error if getting peers failed', function (done) {
      var swarmError = new Error('Swarm error')
      Docker.findDocksByOrgId.yieldsAsync(swarmError)
      Events._forgetWeavePeer('10.0.0.4', '12981', function (err) {
        expect(err).to.exist()
        expect(err).to.equal(swarmError)
        sinon.assert.notCalled(RabbitMQ.publishWeavePeerForget)
        done()
      })
    })
  })

  describe('handleDockerEventStreamDisconnected', function () {
    beforeEach(function (done) {
      sinon.stub(Docker, 'doesDockExist').resolves(false)
      sinon.stub(Events, '_removeWeavePeer').yieldsAsync()
      sinon.stub(Events, '_forgetWeavePeer').yieldsAsync()
      done()
    })
    afterEach(function (done) {
      Docker.doesDockExist.restore()
      Events._removeWeavePeer.restore()
      Events._forgetWeavePeer.restore()
      done()
    })
    it('should not fail if nothing failed', function (done) {
      Events.handleDockerEventStreamDisconnected({
        host: 'http://10.0.0.1:4242',
        org: '11213123'
      }, function (err) {
        expect(err).to.not.exist()
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4242')
        sinon.assert.calledOnce(Events._removeWeavePeer)
        sinon.assert.calledWith(Events._removeWeavePeer, '10.0.0.1', '11213123')
        sinon.assert.calledOnce(Events._forgetWeavePeer)
        sinon.assert.calledWith(Events._forgetWeavePeer, '10.0.0.1', '11213123')
        done()
      })
    })
    it('should do nothing if dock exist', function (done) {
      Docker.doesDockExist.resolves(true)
      Events.handleDockerEventStreamDisconnected({
        host: 'http://10.0.0.1:4242',
        org: '11213123'
      }, function (err) {
        expect(err).to.not.exist()
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4242')
        sinon.assert.notCalled(Events._removeWeavePeer)
        sinon.assert.notCalled(Events._forgetWeavePeer)
        done()
      })
    })
    it('should fail if dock check failed', function (done) {
      var error = new Error('Swarm error')
      Docker.doesDockExist.rejects(error)
      Events.handleDockerEventStreamDisconnected({
        host: 'http://10.0.0.1:4242',
        org: '11213123'
      }, function (err) {
        expect(err).to.be.an.instanceof(WorkerError)
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4242')
        sinon.assert.notCalled(Events._removeWeavePeer)
        sinon.assert.notCalled(Events._forgetWeavePeer)
        done()
      })
    })
    it('should fail if remove peer failed', function (done) {
      var error = new Error('Weave error')
      Events._removeWeavePeer.yieldsAsync(error)
      Events.handleDockerEventStreamDisconnected({
        host: 'http://10.0.0.1:4242',
        org: '11213123'
      }, function (err) {
        expect(err).to.exist()
        expect(err).to.equal(error)
        sinon.assert.calledOnce(Events._removeWeavePeer)
        sinon.assert.calledWith(Events._removeWeavePeer, '10.0.0.1', '11213123')
        sinon.assert.calledOnce(Events._forgetWeavePeer)
        sinon.assert.calledWith(Events._forgetWeavePeer, '10.0.0.1', '11213123')
        done()
      })
    })
    it('should fail if forget peer failed', function (done) {
      var error = new Error('Weave error')
      Events._forgetWeavePeer.yieldsAsync(error)
      Events.handleDockerEventStreamDisconnected({
        host: 'http://10.0.0.1:4242',
        org: '11213123'
      }, function (err) {
        expect(err).to.exist()
        expect(err).to.equal(error)
        sinon.assert.calledOnce(Events._removeWeavePeer)
        sinon.assert.calledWith(Events._removeWeavePeer, '10.0.0.1', '11213123')
        sinon.assert.calledOnce(Events._forgetWeavePeer)
        sinon.assert.calledWith(Events._forgetWeavePeer, '10.0.0.1', '11213123')
        done()
      })
    })
  })

  describe('handleDied', function () {
    beforeEach(function (done) {
      sinon.stub(Events, '_isWeaveContainer')
      sinon.stub(RabbitMQ, 'publishWeaveStart')
      done()
    })

    afterEach(function (done) {
      Events._isWeaveContainer.restore()
      RabbitMQ.publishWeaveStart.restore()
      done()
    })

    it('should publish start if weave container', function (done) {
      Events._isWeaveContainer.returns(true)
      RabbitMQ.publishWeaveStart.returns()

      Events.handleDied({
        host: 'ras',
        tags: 'tag,me'
      })

      expect(RabbitMQ.publishWeaveStart.calledOnce)
        .to.be.true()
      done()
    })

    it('should not publish start', function (done) {
      Events._isWeaveContainer.returns(false)

      Events.handleDied()

      expect(RabbitMQ.publishWeaveStart.calledOnce)
        .to.be.false()
      done()
    })
  }) // end handleDied

  describe('handleStarted', function () {
    beforeEach(function (done) {
      sinon.stub(RabbitMQ, 'publishContainerNetworkAttached')
      sinon.stub(Events, '_isNetworkNeeded')
      sinon.stub(Events, '_isWeaveContainer')
      sinon.stub(WeaveWrapper, 'attach')
      sinon.stub(Docker, 'doesDockExist')
      done()
    })

    afterEach(function (done) {
      RabbitMQ.publishContainerNetworkAttached.restore()
      Events._isNetworkNeeded.restore()
      Events._isWeaveContainer.restore()
      WeaveWrapper.attach.restore()
      Docker.doesDockExist.restore()
      done()
    })

    it('should not attach if network not needed', function (done) {
      Events._isNetworkNeeded.returns(false)

      Events.handleStarted({}, function (err) {
        expect(err).to.not.exist()
        expect(WeaveWrapper.attach.called).to.be.false()
        done()
      })
    })

    it('should cb WorkerError if doesDockExist failed', function (done) {
      var testErr = new BaseError('Dunlendings', 500)
      var testHost = '172.123.12.3'
      var testId = '23984765893264'

      Events._isNetworkNeeded.returns(true)
      Docker.doesDockExist.rejects(testErr)
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
        expect(err).to.be.an.instanceof(WorkerError)
        sinon.assert.notCalled(RabbitMQ.publishContainerNetworkAttached)
        sinon.assert.notCalled(WeaveWrapper.attach)
        done()
      })
    })

    it('should cb WorkerStopError if dock does not exist', function (done) {
      var testHost = '172.123.12.3'
      var testId = '23984765893264'

      Events._isNetworkNeeded.returns(true)
      Docker.doesDockExist.resolves(false)
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
        expect(err).to.be.an.instanceof(WorkerError)
        done()
      })
    })

    it('should cb WorkerError if attach FailedAttach', function (done) {
      var testErr = new FailedAttach(new Error('booz'), 'alan')
      var testHost = '172.123.12.3'
      var testId = '23984765893264'

      Events._isNetworkNeeded.returns(true)
      WeaveWrapper.attach.yields(testErr)
      Docker.doesDockExist.resolves(true)
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
        expect(err).to.be.an.instanceof(WorkerError)
        done()
      })
    })

    it('should WorkerStopError if error WeaveError isIgnorable', function (done) {
      var testErr = new WeaveError(new Error('Dunlendings'), '', '', '')
      sinon.stub(testErr, 'isIgnorable').returns(true)
      var testHost = '172.123.12.3'
      var testId = '23984765893264'
      var orgId = '868976908769078'

      Events._isNetworkNeeded.returns(true)
      WeaveWrapper.attach.yields(testErr)
      Docker.doesDockExist.resolves(true)
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
      }
      Events.handleStarted(jobData, function (err) {
        expect(err).to.be.an.instanceof(WorkerStopError)
        sinon.assert.calledWith(WeaveWrapper.attach, testId, null, orgId, sinon.match.func)
        expect(RabbitMQ.publishContainerNetworkAttached.called).to.be.false()
        done()
      })
    })

    it('should WorkerError if error WeaveError !isIgnorable', function (done) {
      var testErr = new WeaveError(new Error('Dunlendings'), '', '', '')
      sinon.stub(testErr, 'isIgnorable').returns(false)
      var testHost = '172.123.12.3'
      var testId = '23984765893264'
      var orgId = '868976908769078'

      Events._isNetworkNeeded.returns(true)
      WeaveWrapper.attach.yields(testErr)
      Docker.doesDockExist.resolves(true)
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
      }
      Events.handleStarted(jobData, function (err) {
        expect(err).to.be.an.instanceof(WorkerError)
        sinon.assert.calledWith(WeaveWrapper.attach, testId, null, orgId, sinon.match.func)
        expect(RabbitMQ.publishContainerNetworkAttached.called).to.be.false()
        done()
      })
    })

    it('should WorkerStopError if error InvalidArgument', function (done) {
      var testErr = new InvalidArgument('abra', 'kadabra', 'alakazam')
      var testHost = '172.123.12.3'
      var testId = '23984765893264'
      var orgId = '868976908769078'

      Events._isNetworkNeeded.returns(true)
      WeaveWrapper.attach.yields(testErr)
      Docker.doesDockExist.resolves(true)
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
      }
      Events.handleStarted(jobData, function (err) {
        expect(err).to.be.an.instanceof(WorkerStopError)
        sinon.assert.calledWith(WeaveWrapper.attach, testId, null, orgId, sinon.match.func)
        expect(RabbitMQ.publishContainerNetworkAttached.called).to.be.false()
        done()
      })
    })

    it('should publish on attach non 500 and non 409 error', function (done) {
      var testErr = new BaseError('Dunlendings', 403)
      var testHost = '172.123.12.3'
      var testId = '23984765893264'
      var orgId = '868976908769078'

      Events._isNetworkNeeded.returns(true)
      WeaveWrapper.attach.yields(testErr)
      Docker.doesDockExist.resolves(true)
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
      }
      Events.handleStarted(jobData, function (err) {
        expect(err).to.not.exist()
        sinon.assert.calledWith(WeaveWrapper.attach, testId, null, orgId, sinon.match.func)
        expect(RabbitMQ.publishContainerNetworkAttached.called).to.be.false()
        done()
      })
    })

    it('should not publish if inspectData is undefined', function (done) {
      var testIp = '10.0.0.0'
      var testHostname = '172.123.12.3'
      var testHost = testHostname + ':4242'
      var testUri = 'http://' + testHost
      var testId = '23984765893264'
      var orgId = '868976908769078'
      Events._isNetworkNeeded.returns(true)
      WeaveWrapper.attach.yields(null, testIp)
      RabbitMQ.publishContainerNetworkAttached.returns()
      Docker.doesDockExist.resolves(true)
      var jobData = {
        id: testId,
        host: testUri,
        tags: orgId + ',1q2qswedasdasdad,123'
      }

      Events.handleStarted(jobData, function (err) {
        expect(err).to.not.exist()
        jobData.containerIp = testIp
        sinon.assert.notCalled(RabbitMQ.publishContainerNetworkAttached)
        sinon.assert.calledOnce(WeaveWrapper.attach)
        sinon.assert.calledWith(WeaveWrapper.attach, testId, testHost, orgId, sinon.match.func)
        sinon.assert.calledWith(Docker.doesDockExist, testHost)
        done()
      })
    })

    it('should publish correct data', function (done) {
      var testIp = '10.0.0.0'
      var testHostname = '172.123.12.3'
      var testHost = testHostname + ':4242'
      var testUri = 'http://' + testHost
      var testId = '23984765893264'
      var orgId = '868976908769078'
      Events._isNetworkNeeded.returns(true)
      WeaveWrapper.attach.yields(null, testIp)
      RabbitMQ.publishContainerNetworkAttached.returns()
      Docker.doesDockExist.resolves(true)
      var jobData = {
        id: testId,
        host: testUri,
        inspectData: {
          Config: {
            Labels: {
              instanceId: '5633e9273e2b5b0c0077fd41',
              contextVersionId: '563a808f9359ef0c00df34e6'
            }
          }
        },
        tags: orgId + ',1q2qswedasdasdad,123'
      }

      Events.handleStarted(jobData, function (err) {
        expect(err).to.not.exist()
        jobData.containerIp = testIp
        expect(RabbitMQ.publishContainerNetworkAttached
          .withArgs(jobData).called).to.be.true()
        sinon.assert.calledOnce(WeaveWrapper.attach)
        sinon.assert.calledWith(WeaveWrapper.attach, testId, testHost, orgId, sinon.match.func)
        sinon.assert.calledWith(Docker.doesDockExist, testHost)
        done()
      })
    })

    it('should cb error if publish threw', function (done) {
      var testIp = '10.0.0.0'
      var testHostname = '172.123.12.3'
      var testHost = testHostname + ':4242'
      var testUri = 'http://' + testHost
      var testId = '23984765893264'
      var orgId = '868976908769078'
      var testErr = new Error('shadowflax')
      Events._isNetworkNeeded.returns(true)
      WeaveWrapper.attach.yields(null, testIp)
      RabbitMQ.publishContainerNetworkAttached.throws(testErr)
      Docker.doesDockExist.resolves(true)
      var jobData = {
        id: testId,
        host: testUri,
        inspectData: {
          Config: {
            Labels: {
              instanceId: '5633e9273e2b5b0c0077fd41',
              contextVersionId: '563a808f9359ef0c00df34e6'
            }
          }
        },
        tags: orgId + ',1q2qswedasdasdad,123'
      }

      Events.handleStarted(jobData, function (err) {
        expect(err).to.equals(testErr)
        jobData.containerIp = testIp
        expect(RabbitMQ.publishContainerNetworkAttached
          .withArgs(jobData).called).to.be.true()
        sinon.assert.calledOnce(WeaveWrapper.attach)
        sinon.assert.calledWith(WeaveWrapper.attach, testId, testHost, orgId, sinon.match.func)
        sinon.assert.calledWith(Docker.doesDockExist, testHost)
        done()
      })
    })
  }) // end handleStarted

  describe('_isWeaveContainer', function () {
    it('should return true if correct container', function (done) {
      var testData = {
        from: process.env.WEAVE_IMAGE_NAME
      }

      expect(Events._isWeaveContainer(testData))
        .to.be.true()
      done()
    })

    it('should return false if wrong container', function (done) {
      var testData = {
        from: 'wrong'
      }
      expect(Events._isWeaveContainer(testData))
        .to.be.false()
      done()
    })

    it('should return false if from is null', function (done) {
      var testData = {
        from: null
      }
      expect(Events._isWeaveContainer(testData))
        .to.be.false()
      done()
    })
  }) // end _isWeaveContainer

  describe('_isNetworkNeeded', function () {
    beforeEach(function (done) {
      process.env.NETWORK_BLACKLIST = 'weave,swarm'
      done()
    })

    afterEach(function (done) {
      delete process.env.NETWORK_BLACKLIST
      done()
    })

    it('should return false if on blacklist', function (done) {
      ['weave', 'zetto/weave', 'weaveworks/exec', 'aswarm', 'swarm:1.2.2']
      .forEach(function (item) {
        var testData = {
          from: item
        }
        expect(Events._isNetworkNeeded(testData))
          .to.be.false()
      })
      done()
    })

    it('should return true', function (done) {
      var testData = {
        from: 'good'
      }
      expect(Events._isNetworkNeeded(testData))
        .to.be.true()
      done()
    })
  }) // end _isNetworkNeeded

  describe('validateContainerJob', function () {
    it('should return false if no id', function (done) {
      var testData = {}
      expect(Events.validateContainerJob(testData))
        .to.be.false()
      done()
    })

    it('should return false if missing host', function (done) {
      var testData = {
        id: '12352524'
      }
      expect(Events.validateContainerJob(testData))
        .to.be.false()
      done()
    })

    it('should return false if no from', function (done) {
      var testData = {
        id: '12352524',
        host: 'http://localhost:4242'
      }
      expect(Events.validateContainerJob(testData))
        .to.be.false()
      done()
    })

    it('should return false if no tag', function (done) {
      var testData = {
        id: '12352524',
        host: 'http://localhost:4242',
        from: 'something'
      }
      expect(Events.validateContainerJob(testData))
        .to.be.false()
      done()
    })

    it('should return true', function (done) {
      var testData = {
        id: '12352524',
        host: 'http://localhost:4242',
        from: 'something',
        tags: 'me,you,myDogBlue'
      }
      expect(Events.validateContainerJob(testData))
        .to.be.true()
      done()
    })
  }) // end validateContainerJob

  describe('validateDockerJob', function () {
    it('should return false if no tag or host', function (done) {
      var testData = {}
      expect(Events.validateDockerJob(testData))
        .to.be.false()
      done()
    })

    it('should return false if missing tag', function (done) {
      var testData = {
        host: 'http://localhost:4242'
      }
      expect(Events.validateDockerJob(testData))
        .to.be.false()
      done()
    })

    it('should return false if missing host', function (done) {
      var testData = {
        tags: 'me,you,myDogBlue'
      }
      expect(Events.validateDockerJob(testData))
        .to.be.false()
      done()
    })

    it('should return true', function (done) {
      var testData = {
        host: 'http://localhost:4242',
        tags: 'me,you,myDogBlue'
      }
      expect(Events.validateDockerJob(testData))
        .to.be.true()
      done()
    })
  }) // end validateDockerJob
}) // end events.js unit test
