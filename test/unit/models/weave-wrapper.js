'use strict'

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var Code = require('code')
var expect = Code.expect

var sinon = require('sinon')
var childProcess = require('child_process')

var FailedAttach = require('../../../lib/errors/failed-attach.js')
var InvalidArgument = require('../../../lib/errors/invalid-argument.js')
var RabbitMQ = require('../../../lib/models/rabbitmq.js')
var reportFixture = require('../../fixtures/report')
var WeaveError = require('../../../lib/errors/weave-error.js')
var WeaveWrapper = require('../../../lib/models/weave-wrapper.js')

describe('weave-wrapper.js unit test', function () {
  describe('_runCmd', function () {
    var testCmd = 'sudo rm -rf /all'

    beforeEach(function (done) {
      sinon.stub(childProcess, 'exec')
      done()
    })

    afterEach(function (done) {
      childProcess.exec.restore()
      done()
    })

    it('should output stdout', function (done) {
      var testStdout = 'all deleted'
      var testDockerHost = 'http://10.0.0.2:4242'

      childProcess.exec.yieldsAsync(undefined, testStdout)
      WeaveWrapper._runCmd(testCmd, testDockerHost, function (err, stdout) {
        expect(err).to.not.exist()
        expect(stdout).to.equal(testStdout)
        expect(childProcess.exec.withArgs(testCmd, {
          env: {
            DOCKER_HOST: testDockerHost,
            DOCKER_TLS_VERIFY: 1,
            DOCKER_CERT_PATH: process.env.DOCKER_CERT_PATH
          }
        }).called).to.be.true()
        done()
      })
    })

    it('should cb err with stderr', function (done) {
      var testStderr = 'all deleted'
      var testDockerHost = 'http://10.0.0.2:4242'

      childProcess.exec.yieldsAsync(new Error('gone'), '', testStderr)
      WeaveWrapper._runCmd(testCmd, testDockerHost, function (err) {
        expect(err).to.exist()
        expect(err.stderr).to.equal(testStderr)
        expect(childProcess.exec.withArgs(testCmd, {
          env: {
            DOCKER_HOST: testDockerHost,
            DOCKER_TLS_VERIFY: 1,
            DOCKER_CERT_PATH: process.env.DOCKER_CERT_PATH
          }
        }).called).to.be.true()
        done()
      })
    })
  }) // end _runCmd

  describe('launch', function () {
    var testDockerHost = '10.0.0.1:4242'
    var testDockerOrgId = '123412'

    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, '_runCmd')
      sinon.stub(WeaveWrapper, '_handleCmdResult')
      process.env.WEAVE_PATH = '/usr/bin/weave'
      process.env.WEAVE_IP_RANGE = '10.0.0.0/8'
      done()
    })

    afterEach(function (done) {
      WeaveWrapper._runCmd.restore()
      WeaveWrapper._handleCmdResult.restore()
      delete process.env.WEAVE_PATH
      delete process.env.WEAVE_IP_RANGE
      done()
    })

    it('should launch with peers', function (done) {
      WeaveWrapper._runCmd.yieldsAsync()
      WeaveWrapper._handleCmdResult.returnsArg(0)
      var peers = ['10.0.0.1', '10.0.0.2']

      WeaveWrapper.launch(peers, testDockerHost, testDockerOrgId, function (err) {
        expect(err).to.not.exist()
        expect(WeaveWrapper._runCmd
          .withArgs('WEAVE_DOCKER_ARGS=\'--log-driver=syslog\' /usr/bin/weave launch-router --no-dns ' +
            '--ipalloc-range 10.0.0.0/8 --ipalloc-default-subnet 10.0.0.0/8 ' +
            '10.0.0.1 10.0.0.2', testDockerHost)
          .called).to.be.true()
        done()
      })
    })

    it('should launch without peers', function (done) {
      WeaveWrapper._runCmd.yieldsAsync()
      WeaveWrapper._handleCmdResult.returnsArg(0)
      var peers = []

      WeaveWrapper.launch(peers, testDockerHost, testDockerOrgId, function (err) {
        expect(err).to.not.exist()
        expect(WeaveWrapper._runCmd
          .withArgs('WEAVE_DOCKER_ARGS=\'--log-driver=syslog\' /usr/bin/weave launch-router --no-dns ' +
            '--ipalloc-range 10.0.0.0/8 --ipalloc-default-subnet 10.0.0.0/8', testDockerHost)
          .called).to.be.true()
        done()
      })
    })

    it('should fail if invalid peers', function (done) {
      var peers = 'no valid'
      WeaveWrapper.launch(peers, testDockerHost, testDockerOrgId, function (err) {
        expect(err).to.be.instanceof(InvalidArgument)
        expect(err.data.argName).to.equal('peers')
        expect(err.data.expected).to.equal('Array')
        expect(err.data.actual).to.equal(peers)
        done()
      })
    })

    it('should fail if missing peers', function (done) {
      WeaveWrapper.launch(null, testDockerHost, testDockerOrgId, function (err) {
        expect(err).to.be.instanceof(InvalidArgument)
        expect(err.data.argName).to.equal('peers')
        expect(err.data.expected).to.equal('Array')
        expect(err.data.actual).to.equal(null)
        done()
      })
    })
  }) // launch

  describe('forget', function () {
    var testDockerHost = '10.0.0.1'

    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, '_runCmd').yieldsAsync()
      sinon.stub(WeaveWrapper, '_handleCmdResult').returnsArg(0)
      process.env.WEAVE_PATH = '/usr/bin/weave'
      done()
    })

    afterEach(function (done) {
      WeaveWrapper._runCmd.restore()
      WeaveWrapper._handleCmdResult.restore()
      delete process.env.WEAVE_PATH
      done()
    })

    it('should forget', function (done) {
      WeaveWrapper.forget(testDockerHost, '10.0.0.99', function (err) {
        expect(err).to.not.exist()
        sinon.assert.calledWith(WeaveWrapper._runCmd,
          '/usr/bin/weave forget 10.0.0.99', testDockerHost)
        done()
      })
    })
    it('should fail if command failed', function (done) {
      WeaveWrapper._runCmd.yieldsAsync(new Error('Weave error'))
      WeaveWrapper.forget(testDockerHost, '10.0.0.99', function (err) {
        expect(err).to.exist()
        expect(err.message).to.equal('Weave error')
        sinon.assert.calledWith(WeaveWrapper._runCmd,
          '/usr/bin/weave forget 10.0.0.99', testDockerHost)
        done()
      })
    })
  }) // forget

  describe('rmpeer', function () {
    var testDockerHost = '10.0.0.1'

    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, '_runCmd').yieldsAsync()
      sinon.stub(WeaveWrapper, '_handleCmdResult').returnsArg(0)
      process.env.WEAVE_PATH = '/usr/bin/weave'
      done()
    })

    afterEach(function (done) {
      WeaveWrapper._runCmd.restore()
      WeaveWrapper._handleCmdResult.restore()
      delete process.env.WEAVE_PATH
      done()
    })

    it('should remove peer', function (done) {
      WeaveWrapper.rmpeer(testDockerHost, '06:d9:13:68:49:1d', function (err) {
        expect(err).to.not.exist()
        sinon.assert.calledWith(WeaveWrapper._runCmd,
          '/usr/bin/weave rmpeer 06:d9:13:68:49:1d', testDockerHost)
        done()
      })
    })
    it('should fail if command failed', function (done) {
      WeaveWrapper._runCmd.yieldsAsync(new Error('Weave error'))
      WeaveWrapper.rmpeer(testDockerHost, '06:d9:13:68:49:1d', function (err) {
        expect(err).to.exist()
        expect(err.message).to.equal('Weave error')
        sinon.assert.calledWith(WeaveWrapper._runCmd,
          '/usr/bin/weave rmpeer 06:d9:13:68:49:1d', testDockerHost)
        done()
      })
    })
  }) // rmpeer

  describe('report', function () {
    var testDockerHost = '10.0.0.1'

    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, '_runCmd').yieldsAsync(null, JSON.stringify(reportFixture))
      sinon.stub(WeaveWrapper, '_handleCmdResult').returnsArg(0)
      process.env.WEAVE_PATH = '/usr/bin/weave'
      done()
    })

    afterEach(function (done) {
      WeaveWrapper._runCmd.restore()
      WeaveWrapper._handleCmdResult.restore()
      delete process.env.WEAVE_PATH
      done()
    })

    it('should remove peer', function (done) {
      WeaveWrapper.report(testDockerHost, function (err, data) {
        expect(err).to.not.exist()
        sinon.assert.calledWith(WeaveWrapper._runCmd, '/usr/bin/weave report', testDockerHost)
        expect(data).to.equal(reportFixture)
        done()
      })
    })
    it('should fail if command failed', function (done) {
      WeaveWrapper._runCmd.yieldsAsync(new Error('Weave error'))
      WeaveWrapper.report(testDockerHost, function (err) {
        expect(err).to.exist()
        expect(err.message).to.equal('Weave error')
        sinon.assert.calledWith(WeaveWrapper._runCmd, '/usr/bin/weave report', testDockerHost)
        done()
      })
    })
  }) // rmpeer

  describe('attach', function () {
    var testContainerId = '1738'
    var testDockerOrgId = '123412'
    var testDockerHost = '10.2.2.2:4242'

    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, '_runCmd')
      sinon.stub(WeaveWrapper, '_handleCmdResult')
      process.env.WEAVE_PATH = '/usr/bin/weave'
      done()
    })

    afterEach(function (done) {
      WeaveWrapper._runCmd.restore()
      WeaveWrapper._handleCmdResult.restore()
      delete process.env.WEAVE_PATH
      done()
    })

    it('should attach', function (done) {
      WeaveWrapper._runCmd.yieldsAsync(null, '10.0.0.0\n')
      WeaveWrapper._handleCmdResult.returnsArg(0)

      WeaveWrapper.attach(testContainerId, testDockerHost, testDockerOrgId, function (err) {
        expect(err).to.not.exist()
        expect(WeaveWrapper._runCmd
          .withArgs('/usr/bin/weave attach ' + testContainerId, testDockerHost)
            .called).to.be.true()
        done()
      })
    })

    it('should fail if invalid ip', function (done) {
      WeaveWrapper._runCmd.yieldsAsync(null, 'not an ip\n')
      WeaveWrapper._handleCmdResult.returnsArg(0)

      WeaveWrapper.attach(testContainerId, testDockerHost, testDockerOrgId, function (err) {
        expect(err).to.be.instanceof(FailedAttach)
        expect(err.data.containerId).to.equal(testContainerId)
        done()
      })
    })

    it('should fail if missing containerId', function (done) {
      WeaveWrapper._runCmd.yieldsAsync()
      WeaveWrapper.attach(null, testDockerHost, testDockerOrgId, function (err) {
        expect(err).to.be.instanceof(InvalidArgument)
        expect(err.data.argName).to.equal('containerId')
        expect(err.data.expected).to.equal('String')
        expect(err.data.actual).to.equal(null)
        done()
      })
    })

    it('should _handleCmdResult if runCmd failed', function (done) {
      WeaveWrapper._runCmd.yieldsAsync(new Error('Gollum'))
      WeaveWrapper._handleCmdResult.returnsArg(0)
      WeaveWrapper.attach(testContainerId, testDockerHost, testDockerOrgId, function (err) {
        expect(err).to.exist()
        done()
      })
    })
  }) // attach

  describe('_handleCmdResult', function () {
    beforeEach(function (done) {
      sinon.stub(RabbitMQ, 'publishDockLost')
      done()
    })

    afterEach(function (done) {
      RabbitMQ.publishDockLost.restore()
      done()
    })

    it('should cb if no error', function (done) {
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err).to.not.exist()
        done()
      }, 'test', {}, '')(null)
    })

    it('should cb with no error for already running', function (done) {
      var testErr = { message: 'weave already running.' }
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err).to.not.exist()
        done()
      }, 'test', {}, '')(testErr)
    })

    it('should cb with no error for already running', function (done) {
      var testErr = { message: 'Found another version of weave running. Aborting.' }
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err).to.not.exist()
        done()
      }, 'test', {}, '')(testErr)
    })

    it('should cb with error and publish dock unhealthy on Out Of Memory', function (done) {
      var testErr = { message: 'Error response from daemon: Untar error on re-exec cmd: fork/exec /proc/self/exe: cannot allocate memory' }
      var debug = {
        githubId: 1234,
        host: 'asdasdasasdasadsgasdgdsg'
      }
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err).to.be.instanceof(WeaveError)
        sinon.assert.calledOnce(RabbitMQ.publishDockLost)
        sinon.assert.calledWith(RabbitMQ.publishDockLost, debug)
        done()
      }, 'test', '', debug)(testErr)
    })

    it('should cb err without other side effects ', function (done) {
      const testErr = new Error('random error')
      const testStdout = 'stdout'
      const testStderr = 'stderr'
      const testCmd = 'echo love'
      const testDebug = {
        data: 'is',
        nice: '.'
      }

      testErr.stderr = testStderr
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err).to.be.instanceof(WeaveError)
        expect(err.data.err).to.equal(testErr)
        expect(err.data.stdout).to.equal(testStdout)
        expect(err.data.stderr).to.equal(testStderr)
        expect(err.data.command).to.equal(testCmd)
        expect(err.data.extra).to.equal(testDebug)
        sinon.assert.notCalled(RabbitMQ.publishDockLost)
        done()
      }, '', testCmd, testDebug)(testErr, testStdout)
    })
  }) // end _handleCmdResult
})
