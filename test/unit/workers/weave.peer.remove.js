'use strict';
require('loadenv')();

var Promise = require('bluebird');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var afterEach = lab.afterEach;
var beforeEach = lab.beforeEach;
var Code = require('code');
var expect = Code.expect;

var sinon = require('sinon');
var TaskFatalError = require('ponos').TaskFatalError;

var Docker = require('../../../lib/models/docker')
var WeaveWrapper = require('../../../lib/models/weave-wrapper')
var weavePeerRemove = require('../../../lib/workers/weave.peer.remove');

describe('weave.peer.remove.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, 'rmpeerAsync').returns(null)
      sinon.stub(Docker, 'doesDockExist').returns(true)
      done();
    });

    afterEach(function (done) {
      WeaveWrapper.rmpeerAsync.restore();
      Docker.doesDockExist.restore();
      done();
    });

    it('should throw missing dockerHost', function (done) {
      weavePeerRemove({})
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(TaskFatalError);
        done();
      });
    });

    it('should throw missing hostname', function (done) {
      weavePeerRemove({
        dockerHost: '10.0.0.1:4224',
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(TaskFatalError);
        done();
      });
    });
    it('should throw missing orgId', function (done) {
      weavePeerRemove({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.2'
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(TaskFatalError);
        done();
      });
    });
    it('should throw error if dock check failed', function (done) {
      var rejectError = new Error('test')
      var rejectionPromise = Promise.reject(rejectError)
      rejectionPromise.suppressUnhandledRejections()
      Docker.doesDockExist.returns(rejectionPromise)
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
        done();
      });
    });
    it('should throw error if dock does not exist', function (done) {
      Docker.doesDockExist.returns(false)
      weavePeerRemove({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99',
        orgId: '123567'
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(TaskFatalError)
        expect(err.message).to.equal('weave.peer.remove: Dock was removed')
        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.1:4224')
        sinon.assert.notCalled(WeaveWrapper.rmpeerAsync)
        done();
      });
    });
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
    });
  }); // end run
}); // end weave.peer.remove
