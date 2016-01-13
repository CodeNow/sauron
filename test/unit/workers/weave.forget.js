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

var Docker = require('../../../lib/models/docker');
var WeaveWrapper = require('../../../lib/models/weave-wrapper');
var weaveForget = require('../../../lib/workers/weave.forget');

describe('weave.forget.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, 'forgetAsync').returns(null);
      sinon.stub(Docker, 'doesDockExistAsync').returns(true);
      done();
    });

    afterEach(function (done) {
      WeaveWrapper.forgetAsync.restore();
      Docker.doesDockExistAsync.restore();
      done();
    });

    it('should throw missing dockerHost', function (done) {
      weaveForget({})
        .then(function () {
          throw new Error('should have thrown');
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(TaskFatalError);
          done();
        });
    });

    it('should throw missing hostname', function (done) {
      weaveForget({
        dockerHost: '10.0.0.1:4224',
      })
      .then(function () {
        throw new Error('should have thrown');
      })
      .catch(function (err) {
        expect(err).to.be.instanceOf(TaskFatalError);
        done();
      });
    });

    it('should be fine if no errors', function (done) {
      weaveForget({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99'
      }).asCallback(function (err) {
        expect(err).to.not.exist()
        expect(Docker.doesDockExistAsync.calledOnce).to.be.true()
        expect(Docker.doesDockExistAsync.withArgs('10.0.0.1:4224').called).to.be.true()
        expect(WeaveWrapper.forgetAsync.calledOnce).to.be.true()
        expect(WeaveWrapper.forgetAsync.withArgs('10.0.0.1:4224', '10.0.0.99').called).to.be.true()
        done()
      });
    });
    it('should throw error if dock check failed', function (done) {
      var rejectError = new Error('test')
      var rejectionPromise = Promise.reject(rejectError)
      rejectionPromise.suppressUnhandledRejections()
      Docker.doesDockExistAsync.returns(rejectionPromise)
      weaveForget({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99'
      })
      .then(function () {
        throw new Error('should have thrown');
      })
      .catch(function (err) {
        expect(err).to.be.instanceOf(Error)
        expect(err).to.equal(rejectError)
        expect(Docker.doesDockExistAsync.calledOnce).to.be.true()
        expect(Docker.doesDockExistAsync.withArgs('10.0.0.1:4224').called).to.be.true()
        expect(WeaveWrapper.forgetAsync.notCalled).to.be.true()
        done();
      });
    });
    it('should throw fatal error if dock does not exist', function (done) {
      Docker.doesDockExistAsync.returns(false)
      weaveForget({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99'
      })
      .then(function () {
        throw new Error('should have thrown');
      })
      .catch(function (err) {
        expect(err).to.be.instanceOf(TaskFatalError)
        expect(err.message).to.equal('weave.forget: Dock was removed')
        expect(Docker.doesDockExistAsync.calledOnce).to.be.true()
        expect(Docker.doesDockExistAsync.withArgs('10.0.0.1:4224').called).to.be.true()
        expect(WeaveWrapper.forgetAsync.notCalled).to.be.true()
        done();
      });
    });
    it('should throw error if weave command failed', function (done) {
      var rejectError = new Error('test')
      var rejectionPromise = Promise.reject(rejectError)
      rejectionPromise.suppressUnhandledRejections()
      WeaveWrapper.forgetAsync.returns(rejectionPromise)
      weaveForget({
        dockerHost: '10.0.0.1:4224',
        hostname: '10.0.0.99'
      })
      .then(function () {
        throw new Error('should have thrown');
      })
      .catch(function (err) {
        expect(err).to.be.instanceOf(Error)
        expect(err).to.equal(rejectError)
        expect(Docker.doesDockExistAsync.calledOnce).to.be.true()
        expect(Docker.doesDockExistAsync.withArgs('10.0.0.1:4224').called).to.be.true()
        expect(WeaveWrapper.forgetAsync.calledOnce).to.be.true()
        expect(WeaveWrapper.forgetAsync.withArgs('10.0.0.1:4224', '10.0.0.99').called).to.be.true()
        done();
      });
    });
  }); // end run
}); // end weave.forget
