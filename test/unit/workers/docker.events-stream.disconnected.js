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
var dockerEventsStreamDisconnected = require('../../../lib/workers/docker.events-stream.disconnected.js');

describe('docker.events-stream.disconnected.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(Events, 'handleDockRemovedAsync').returns();
      done();
    });

    afterEach(function (done) {
      Events.handleDockRemovedAsync.restore();
      done();
    });

    it('should throw missing host', function (done) {
      dockerEventsStreamDisconnected({})
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(TaskFatalError);
        done();
      })
    });

    it('should throw missing org', function (done) {
      dockerEventsStreamDisconnected({
        host: 'http://10.0.0.1:4224',
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(TaskFatalError);
        done();
      })
    });

    it('should be fine if no errors', function (done) {
      dockerEventsStreamDisconnected({
        host: 'http://10.0.0.1:4224',
        org: '12345'
      })
      .asCallback(done);
    });

    it('should throw error if setup failed', function (done) {
      Events.handleDockRemovedAsync.throws(new Error('test'));
      dockerEventsStreamDisconnected({
        host: 'http://10.0.0.1:4224',
        org: '12345'
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(Error)
        done();
      })
    });
  }); // end run
}); // end docker.events-stream.disconnected
