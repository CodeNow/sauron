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

var WeaveWrapper = require('../../../lib/models/weave-wrapper.js');
var weavePeerRemove = require('../../../lib/workers/weave.peer.remove.js');
var reportFixture = require('../../fixtures/report')

describe('weave.peer.remove.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, 'reportAsync').returns(Promise.resolve(reportFixture));
      sinon.stub(WeaveWrapper, 'rmpeerAsync').returns(null);
      done();
    });

    afterEach(function (done) {
      WeaveWrapper.reportAsync.restore();
      WeaveWrapper.rmpeerAsync.restore();
      done();
    });

    it('should throw missing dockerHost', function (done) {
      weavePeerRemove({})
        .then(function () {
          throw new Error('should have thrown');
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(TaskFatalError);
          done();
        });
    });

    it('should throw missing host', function (done) {
      weavePeerRemove({
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

    it('should throw error if report failed', function (done) {
      var rejectError = new Error('test')
      var rejectionPromise = Promise.reject(rejectError)
      rejectionPromise.suppressUnhandledRejections()
      WeaveWrapper.reportAsync.returns(rejectionPromise)
      weavePeerRemove({
        dockerHost: '10.0.0.1:4224',
        host: '10.0.0.99'
      })
      .then(function () {
        throw new Error('should have thrown');
      })
      .catch(function (err) {
        expect(err).to.be.instanceOf(Error);
        expect(err).to.equal(rejectError)
        done();
      });
    });
    it('should throw error if report failed', function (done) {
      var rejectError = new Error('test')
      var rejectionPromise = Promise.reject(rejectError)
      rejectionPromise.suppressUnhandledRejections()
      WeaveWrapper.rmpeerAsync.returns(rejectionPromise)
      weavePeerRemove({
        dockerHost: '10.0.0.1:4224',
        host: '10.4.145.68'
      })
      .then(function () {
        throw new Error('should have thrown');
      })
      .catch(function (err) {
        expect(err).to.be.instanceOf(Error);
        expect(err).to.equal(rejectError)
        expect(WeaveWrapper.reportAsync.calledOnce).to.be.true()
        expect(WeaveWrapper.reportAsync.withArgs('10.0.0.1:4224').called).to.be.true()
        expect(WeaveWrapper.rmpeerAsync.calledOnce).to.be.true()
        expect(WeaveWrapper.rmpeerAsync.withArgs('10.0.0.1:4224', 'b2:88:af:6b:2a:d5').called).to.be.true()
        done();
      });
    });
    it('should fattaly fail if peer not found', function (done) {
      weavePeerRemove({
        dockerHost: '10.0.0.1:4224',
        host: '10.4.145.67'
      })
      .then(function () {
        throw new Error('should have thrown');
      })
      .catch(function (err) {
        expect(err).to.be.instanceOf(TaskFatalError);
        expect(WeaveWrapper.reportAsync.calledOnce).to.be.true()
        expect(WeaveWrapper.reportAsync.withArgs('10.0.0.1:4224').called).to.be.true()
        expect(WeaveWrapper.rmpeerAsync.notCalled).to.be.true()
        done();
      });
    });
    it('should work if nothing failed', function (done) {
      weavePeerRemove({
        dockerHost: '10.0.0.1:4224',
        host: '10.4.145.68'
      }).asCallback(function (err) {
        expect(err).to.not.exist()
        expect(WeaveWrapper.reportAsync.calledOnce).to.be.true()
        expect(WeaveWrapper.reportAsync.withArgs('10.0.0.1:4224').called).to.be.true()
        expect(WeaveWrapper.rmpeerAsync.calledOnce).to.be.true()
        expect(WeaveWrapper.rmpeerAsync.withArgs('10.0.0.1:4224', 'b2:88:af:6b:2a:d5').called).to.be.true()
        done()
      })
    });
  }); // end run
}); // end weave.peer.remove
