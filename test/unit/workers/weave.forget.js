'use strict';
require('loadenv')();

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
var weaveForget = require('../../../lib/workers/weave.forget.js');

describe('weave.forget.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, 'forgetAsync').returns(null);
      done();
    });

    afterEach(function (done) {
      WeaveWrapper.forgetAsync.restore();
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

    it('should throw missing host', function (done) {
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
        host: '10.0.0.99'
      }).asCallback(done);
    });

    // it('should throw error if setup failed', function (done) {
    //   var rejectionPromise = Promise.reject(new Error('test'))
    //   rejectionPromise.suppressUnhandledRejections()
    //   WeaveWrapper.forgetAsync.returns(rejectionPromise)
    //   weaveForget({
    //     dockerHost: '10.0.0.1:4224',
    //     host: '10.0.0.99'
    //   })
    //   // .then(function () {
    //   //   throw new Error('should have thrown');
    //   // })
    //   .catch(function (err) {
    //     expect(err).to.be.instanceOf(Error);
    //     done();
    //   });
    // });
  }); // end run
}); // end weave.forget
