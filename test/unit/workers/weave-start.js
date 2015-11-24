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

var Events = require('../../../lib/models/events.js');
var weaveStart = require('../../../lib/workers/weave-start.js');

describe('weave-start.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(Events, 'handleStartAsync');
      done();
    });

    afterEach(function (done) {
      Events.handleStartAsync.restore();
      done();
    });

    it('should throw error if setup failed', function (done) {
      Events.handleStartAsync.throws(new Error('test'));
      weaveStart({})
        .then(function () {
          throw new Error('should have thrown');
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(Error);
          done();
        });
    });

    it('should throw missing dockerUri', function (done) {
      weaveStart({})
        .then(function () {
          throw new Error('should have thrown');
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(TaskFatalError);
          done();
        });
    });

    it('should throw missing orgId', function (done) {
      weaveStart({
        dockerUri: 'http:12.12.1.2:4242'
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
      Events.handleStartAsync.returns();
      weaveStart({
        dockerUri: '10.0.0.1:4224',
        orgId: 'runnable'
      })
      .then(done)
      .catch(done);
    });
  }); // end run
}); // end weave-start
