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

const sinon = require('sinon')
require('sinon-as-promised')(require('bluebird'))
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const Docker = require('../../../lib/models/docker')
const WeaveWrapper = require('../../../lib/models/weave-wrapper')
const weaveForget = require('../../../lib/workers/weave.peer.forget').task

describe('weave.peer.forget.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, 'forgetAsync').resolves(null)
      sinon.stub(Docker, 'doesDockExist').resolves(true)
      done()
    })

    afterEach(function (done) {
      WeaveWrapper.forgetAsync.restore()
      Docker.doesDockExist.restore()
      done()
    })

    it('should be fine if no errors', function (done) {
      const orgGitHubId = '123'
      weaveForget({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99',
        orgId: orgGitHubId
      })
      .asCallback(function (err) {
        expect(err).to.not.exist()
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4224', orgGitHubId)
        sinon.assert.calledOnce(WeaveWrapper.forgetAsync)
        sinon.assert.calledWith(WeaveWrapper.forgetAsync, '10.0.0.1:4224', '10.0.0.99')
        done()
      })
    })
    it('should throw error if dock check failed', function (done) {
      const orgGitHubId = '123'
      const rejectError = new Error('test')
      Docker.doesDockExist.rejects(rejectError)
      weaveForget({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99',
        orgId: orgGitHubId
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(Error)
        expect(err).to.equal(rejectError)
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4224', orgGitHubId)
        sinon.assert.notCalled(WeaveWrapper.forgetAsync)
        done()
      })
    })
    it('should throw fatal error if dock does not exist', function (done) {
      const orgGitHubId = '123'
      Docker.doesDockExist.resolves(false)
      weaveForget({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99',
        orgId: orgGitHubId
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(WorkerStopError)
        expect(err.message).to.equal('Dock was removed')
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4224', orgGitHubId)
        sinon.assert.notCalled(WeaveWrapper.forgetAsync)
        done()
      })
    })
    it('should throw error if weave command failed', function (done) {
      const orgGitHubId = '123'
      const rejectError = new Error('test')
      WeaveWrapper.forgetAsync.rejects(rejectError)
      weaveForget({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99',
        orgId: orgGitHubId
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(Error)
        expect(err).to.equal(rejectError)
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4224', orgGitHubId)
        sinon.assert.calledOnce(WeaveWrapper.forgetAsync)
        sinon.assert.calledWith(WeaveWrapper.forgetAsync, '10.0.0.1:4224', '10.0.0.99')
        done()
      })
    })
  }) // end run
}) // end weave.peer.forget
