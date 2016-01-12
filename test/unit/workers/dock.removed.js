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
var dockRemoved = require('../../../lib/workers/dock.removed.js');

describe('dock.removed.js unit test', function () {
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
      dockRemoved({})
        .then(function () {
          throw new Error('should have thrown');
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(TaskFatalError);
          done();
        });
    });

    it('should throw missing githubId', function (done) {
      dockRemoved({
        host: 'http://10.0.0.1:4224',
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
      dockRemoved({
        host: 'http://10.0.0.1:4224',
        githubId: '12345'
      })
      .asCallback(done);
    });
    
    it('should throw error if setup failed', function (done) {
      Events.handleDockRemovedAsync.throws(new Error('test'));
      dockRemoved({
        host: 'http://10.0.0.1:4224',
        githubId: '12345'
      })
      .then(function () {
        throw new Error('should have thrown');
      })
      .catch(function (err) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
    });
  }); // end run
}); // end dock.removed
