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
var RabbitMQ = require('../../lib/models/rabbitmq.js');
var Start = require('../../lib/start.js');

describe('start.js unit test', function () {
  describe('startup', function () {
    beforeEach(function (done) {
      sinon.stub(Redis, 'connect');
      sinon.stub(Events, 'listen');
      sinon.stub(WeaveSetup, 'setup');
      sinon.stub(RabbitMQ, 'connect');
      done();
    });

    afterEach(function (done) {
      Redis.connect.restore();
      Events.listen.restore();
      WeaveSetup.setup.restore();
      RabbitMQ.connect.restore();
      done();
    });

    it('should startup all services', function (done) {
      Redis.connect.returns();
      Events.listen.returns();
      RabbitMQ.connect.returns();
      WeaveSetup.setup.yieldsAsync();

      Start.startup(function (err) {
        expect(err).to.not.exist();
        expect(Redis.connect.calledOnce).to.be.true();
        expect(Events.listen.calledOnce).to.be.true();
        expect(RabbitMQ.connect.calledOnce).to.be.true();
        expect(WeaveSetup.setup.calledOnce).to.be.true();
        done();
      });
    });

    it('should cb err if weave setup failed', function (done) {
      Redis.connect.returns();
      Events.listen.returns();
      RabbitMQ.connect.returns();
      WeaveSetup.setup.yieldsAsync('Balrogs');

      Start.startup(function (err) {
        expect(err).to.exist();
        done();
      });
    });
  }); // end startup

  describe('shutdown', function () {
    beforeEach(function (done) {
      sinon.stub(Redis, 'disconnect');
      sinon.stub(Events, 'stop');
      sinon.stub(RabbitMQ, 'disconnect');
      done();
    });

    afterEach(function (done) {
      Redis.disconnect.restore();
      Events.stop.restore();
      RabbitMQ.disconnect.restore();
      done();
    });

    it('should shutdown all services', function (done) {
      Redis.disconnect.returns();
      Events.stop.returns();
      RabbitMQ.disconnect.yieldsAsync();

      Start.shutdown(function (err) {
        expect(err).to.not.exist();
        expect(Redis.disconnect.calledOnce).to.be.true();
        expect(Events.stop.calledOnce).to.be.true();
        expect(RabbitMQ.disconnect.calledOnce).to.be.true();
        done();
      });
    });

    it('should cb err if weave disconnect failed', function (done) {
      Redis.disconnect.returns();
      Events.stop.returns();
      RabbitMQ.disconnect.yieldsAsync('Balrogs');

      Start.shutdown(function (err) {
        expect(err).to.exist();
        done();
      });
    });
  }); // end shutdown
}); // end start.js unit test