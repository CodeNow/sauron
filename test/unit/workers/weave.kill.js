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

const BaseDockerClient = require('@runnable/loki')._BaseClient
var sinon = require('sinon')
require('sinon-as-promised')(Promise)
var TaskFatalError = require('ponos').TaskFatalError

var Docker = require('../../../lib/models/docker')
var weaveKill = require('../../../lib/workers/weave.kill')

describe('weave.kill.js unit test', function () {
  beforeEach(function (done) {
    sinon.stub(BaseDockerClient.prototype, 'killContainerAsync').returns()
    done()
  })

  afterEach(function (done) {
    BaseDockerClient.prototype.killContainerAsync.restore()
    done()
  })

  it('should throw missing containerId', function (done) {
    weaveKill({})
    .asCallback(function (err) {
      expect(err).to.be.instanceOf(TaskFatalError)
      done()
    })
  })

  it('should be fine if no errors', function (done) {
    weaveKill({
      containerId: 'container-id-1'
    })
    .asCallback(function (err) {
      expect(err).to.not.exist()
      sinon.assert.calledOnce(BaseDockerClient.prototype.killContainerAsync)
      sinon.assert.calledWith(BaseDockerClient.prototype.killContainerAsync, 'container-id-1')
      done()
    })
  })
  it('should throw error kill failed', function (done) {
    var dockerError = new Error('Docker error')
    BaseDockerClient.prototype.killContainerAsync.rejects(dockerError)
    weaveKill({
      containerId: 'container-id-1'
    })
    .asCallback(function (err) {
      expect(err).to.be.instanceOf(Error)
      expect(err.message).to.equal(dockerError.message)
      sinon.assert.calledOnce(BaseDockerClient.prototype.killContainerAsync)
      sinon.assert.calledWith(BaseDockerClient.prototype.killContainerAsync, 'container-id-1')
      done()
    })
  })
  it('should throw fatal error if 404', function (done) {
    var dockerError = new Error('Docker error')
    dockerError.statusCode = 404
    Docker.killContainerAsync.rejects(dockerError)
    weaveKill({
      containerId: 'container-id-1'
    })
    .asCallback(function (err) {
      expect(err).to.be.instanceOf(TaskFatalError)
      expect(err.message).to.equal('weave.kill: Container was not found')
      sinon.assert.calledOnce(BaseDockerClient.prototype.killContainerAsync)
      sinon.assert.calledWith(BaseDockerClient.prototype.killContainerAsync, 'container-id-1')
      done()
    })
  })
}) // end weave.kill
