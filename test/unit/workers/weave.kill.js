'use strict'
require('loadenv')()

const Promise = require('bluebird')
const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const Code = require('code')
const expect = Code.expect

const BaseDockerClient = require('@runnable/loki')._BaseClient
const sinon = require('sinon')
require('sinon-as-promised')(Promise)
const TaskFatalError = require('ponos').TaskFatalError

const weaveKill = require('../../../lib/workers/weave.kill')

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
    const dockerError = new Error('Docker error')
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
    const dockerError = new Error('Docker error')
    dockerError.statusCode = 404
    BaseDockerClient.prototype.killContainerAsync.rejects(dockerError)
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
