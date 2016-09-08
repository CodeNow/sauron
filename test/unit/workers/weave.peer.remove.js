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
const weavePeerRemove = require('../../../lib/workers/weave.peer.remove').task

describe('weave.peer.remove.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, 'rmpeerAsync').resolves(null)
      sinon.stub(Docker, 'doesDockExist').resolves(true)
      done()
    })

    afterEach(function (done) {
      WeaveWrapper.rmpeerAsync.restore()
      Docker.doesDockExist.restore()
      done()
    })

    it('should throw error if dock check failed', function (done) {
      const rejectError = new Error('test')
      Docker.doesDockExist.rejects(rejectError)
      weavePeerRemove({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99',
        orgId: '123567'
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(Error)
        expect(err).to.equal(rejectError)
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4224')
        sinon.assert.notCalled(WeaveWrapper.rmpeerAsync)
        done()
      })
    })
    it('should throw error if dock does not exist', function (done) {
      Docker.doesDockExist.resolves(false)
      weavePeerRemove({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99',
        orgId: '123567'
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(WorkerStopError)
        expect(err.message).to.equal('Dock was removed')
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4224')
        sinon.assert.notCalled(WeaveWrapper.rmpeerAsync)
        done()
      })
    })
    it('should work if nothing failed', function (done) {
      weavePeerRemove({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.4.145.68',
        orgId: '123567'
      })
      .asCallback(function (err) {
        expect(err).to.not.exist()
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4224')
        sinon.assert.calledOnce(WeaveWrapper.rmpeerAsync)
        sinon.assert.calledWith(WeaveWrapper.rmpeerAsync, '10.0.0.1:4224', 'ip-10-4-145-68.123567')
        done()
      })
    })
  }) // end run
}) // end weave.peer.remove
