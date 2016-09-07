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
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const weaveKill = require('../../../lib/workers/weave.kill').task

describe('weave.kill.js unit test', function () {
  beforeEach(function (done) {
    sinon.stub(BaseDockerClient.prototype, 'killContainerAsync').resolves()
    done()
  })

  afterEach(function (done) {
    BaseDockerClient.prototype.killContainerAsync.restore()
    done()
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
      expect(err).to.be.instanceOf(WorkerStopError)
      expect(err.message).to.equal('Container was not found')
      sinon.assert.calledOnce(BaseDockerClient.prototype.killContainerAsync)
      sinon.assert.calledWith(BaseDockerClient.prototype.killContainerAsync, 'container-id-1')
      done()
    })
  })
}) // end weave.kill
