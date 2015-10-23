'use strict';

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var afterEach = lab.afterEach;
var beforeEach = lab.beforeEach;
var Code = require('code');
var expect = Code.expect;

var sinon = require('sinon');

var Redis = require('../../lib/models/redis.js');
var Events = require('../../lib/models/events.js');
var WeaveSetup = require('../../lib/models/weave-setup.js');
var Start = require('../../lib/start.js');

describe('start.js unit test', function () {
  describe('startup', function () {
    beforeEach(function (done) {
      sinon.stub(Redis, 'connect');
      sinon.stub(Events, 'listen');
      sinon.stub(WeaveSetup, 'setup');
      done();
    });

    afterEach(function (done) {
      Redis.connect.restore();
      Events.listen.restore();
      WeaveSetup.setup.restore();
      done();
    });

    it('should startup all services', function (done) {
      Redis.connect.returns();
      Events.listen.returns();
      WeaveSetup.setup.yieldsAsync();

      Start.startup(function (err) {
        expect(err).to.not.exist();
        expect(Redis.connect.calledOnce).to.be.true();
        expect(Events.listen.calledOnce).to.be.true();
        expect(WeaveSetup.setup.calledOnce).to.be.true();
        done();
      });
    });

    it('should cb err if weave setup failed', function (done) {
      Redis.connect.returns();
      Events.listen.returns();
      WeaveSetup.setup.yieldsAsync('Balrogs');

      Start.startup(function (err) {
        expect(err).to.exist();
        done();
      });
    });
  }); // end startup
}); // end start.js unit test