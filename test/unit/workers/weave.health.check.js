'use strict'
require('loadenv')()

var Promise = require('bluebird')
var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var Code = require('code')
var expect = Code.expect

var sinon = require('sinon')
require('sinon-as-promised')(Promise)
var TaskFatalError = require('ponos').TaskFatalError

var Docker = require('../../../lib/models/docker')
var rabbitmq = require('../../../lib/models/rabbitmq')
var weaveHealthCheck = require('../../../lib/workers/weave.health.check')

describe('weave.health.check.js unit test', function () {
  beforeEach(function (done) {
    sinon.stub(Docker, 'getLogsAsync').returns()
    sinon.stub(rabbitmq, 'publishWeaveKill').returns()
    done()
  })

  afterEach(function (done) {
    Docker.getLogsAsync.restore()
    rabbitmq.publishWeaveKill.restore()
    done()
  })

  it('should throw missing containerId', function (done) {
    weaveHealthCheck({})
    .asCallback(function (err) {
      expect(err).to.be.instanceOf(TaskFatalError)
      done()
    })
  })

  it('should be fine if no errors', function (done) {
    weaveHealthCheck({
      containerId: 'container-id-1'
    })
    .asCallback(function (err) {
      expect(err).to.not.exist()
      sinon.assert.calledOnce(Docker.getLogsAsync)
      sinon.assert.calledWith(Docker.getLogsAsync, 'container-id-1')
      sinon.assert.notCalled(rabbitmq.publishWeaveKill)
      done()
    })
  })
  it('should publish weave kill', function (done) {
    Docker.getLogsAsync.returns('Error: netlink error response: no such device')
    weaveHealthCheck({
      containerId: 'container-id-1'
    })
    .asCallback(function (err) {
      expect(err).to.not.exist()
      sinon.assert.calledOnce(Docker.getLogsAsync)
      sinon.assert.calledWith(Docker.getLogsAsync, 'container-id-1')
      sinon.assert.calledOnce(rabbitmq.publishWeaveKill)
      sinon.assert.calledWith(rabbitmq.publishWeaveKill, {
        containerId: 'container-id-1'
      })
      done()
    })
  })
  it('should throw error logs failed', function (done) {
    var dockerError = new Error('Docker error')
    Docker.getLogsAsync.rejects(dockerError)
    weaveHealthCheck({
      containerId: 'container-id-1'
    })
    .asCallback(function (err) {
      expect(err).to.be.instanceOf(Error)
      expect(err.message).to.equal(dockerError.message)
      sinon.assert.calledOnce(Docker.getLogsAsync)
      sinon.assert.calledWith(Docker.getLogsAsync, 'container-id-1')
      done()
    })
  })
  it('should throw fatal error if 404', function (done) {
    var dockerError = new Error('Docker error')
    dockerError.statusCode = 404
    Docker.getLogsAsync.rejects(dockerError)
    weaveHealthCheck({
      containerId: 'container-id-1'
    })
    .asCallback(function (err) {
      expect(err).to.be.instanceOf(TaskFatalError)
      expect(err.message).to.equal('weave.health.check: Container was not found')
      sinon.assert.calledOnce(Docker.getLogsAsync)
      sinon.assert.calledWith(Docker.getLogsAsync, 'container-id-1')
      done()
    })
  })
}) // end weave.health.check
