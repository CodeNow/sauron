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

var ip = require('ip');
var sinon = require('sinon');
var redis = require('redis');
var path = require('path');
var fs = require('fs');
var hermesClient = require('runnable-hermes');
var ErrorCat = require('error-cat');

var testRedisClient = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_IPADDRESS);

var testRedisPubSub = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_IPADDRESS);

var testRabbit = hermesClient
  .hermesSingletonFactory({
    hostname: process.env.RABBITMQ_HOSTNAME,
    password: process.env.RABBITMQ_PASSWORD,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    queues: [ 'container-network-attached', 'container-network-attach-failed' ]
  })
  .connect();

var Start = require('../../lib/start.js');

describe('events functional test', function () {
  beforeEach(function (done) {
    sinon.stub(ErrorCat.prototype, 'report').returns();
    testRedisClient.flushdb(done);
  });

  beforeEach(function (done) {
    process.env.WEAVE_PATH = path.resolve(__dirname, '../fixtures/weaveMock');
    Start.startup(done);
  });

  afterEach(function (done) {
    Start.shutdown(done);
    ErrorCat.prototype.report.restore();
  });

  describe('runnable:docker:events:die', function () {
    var exitHook;
    beforeEach(function (done) {
      sinon.stub(process, 'exit', function () {
        exitHook();
      });
      done();
    });

    afterEach(function (done) {
      process.exit.restore();
      done();
    });

    it('should call exit for weave container', function (done) {
      ErrorCat.prototype.report.onCall(0).yieldsAsync();
      testRedisPubSub.publish('runnable:docker:events:die', JSON.stringify({
        host: 'http://' + ip.address() + ':4242',
        id: '237c9ccf14e89a6e23fb15f2d9132efd98878f6267b9f128f603be3b3e362472',
        from: 'weaveworks/weave:1.2.0',
        inspectData: {
          Config: {
            ExposedPorts: {
              '6783/tcp': {},
              '6783/udp': {}
            }
          }
        }
      }));
      exitHook = function () {
        done();
      };
    });
  }); // end runnable:docker:events:die

  describe('runnable:docker:events:start', function () {
    beforeEach(function (done) {
      fs.unlink('./weaveMockArgs', function () {
        done();
      });
    });

    it('should call weave attach on container and emit event', function (done) {
      var testId = 'Andune';
      testRabbit.subscribe('container-network-attached', function (data, cb) {
        expect(data.containerId).to.equal(testId);
        expect(data.host).to.equal('http://' + ip.address() + ':4242');
        expect(data.containerIp).to.equal('10.0.17.38');
        expect(data.inspectData.Config.Labels.instanceId).to.equal('5633e9273e2b5b0c0077fd41');
        expect(data.inspectData.Config.Labels.contextVersionId).to.equal('563a808f9359ef0c00df34e6');
        var weaveInput = fs.readFileSync('./weaveMockArgs');
        expect(weaveInput.toString()).to.equal('attach Andune\n');
        cb();
        done();
      });
      testRedisPubSub.publish('runnable:docker:events:start', JSON.stringify({
        host: 'http://' + ip.address() + ':4242',
        id: testId,
        from: 'ubuntu',
        inspectData: {
          Config: {
            Labels: {
              instanceId: '5633e9273e2b5b0c0077fd41',
              contextVersionId: '563a808f9359ef0c00df34e6'
            }
          }
        }
      }));
    });

    it('should call emit fail if attach failed', function (done) {
      var testId = 'Andune';
      process.env.WEAVE_PATH = path.resolve(__dirname, '../fixtures/weaveMock fail');
      testRabbit.subscribe('container-network-attach-failed', function (data, cb) {
        expect(data.containerId).to.equal(testId);
        expect(data.host).to.equal('http://' + ip.address() + ':4242');
        expect(data.err.data.err.stderr).to.equal('weave command fail attach Andune failed\n');
        expect(data.inspectData.Config.Labels.instanceId).to.equal('5633e9273e2b5b0c0077fd41');
        expect(data.inspectData.Config.Labels.contextVersionId).to.equal('563a808f9359ef0c00df34e6');
        var weaveInput = fs.readFileSync('./weaveMockArgs');
        expect(weaveInput.toString()).to.equal('fail attach Andune\n');
        cb();
        done();
      });
      testRedisPubSub.publish('runnable:docker:events:start', JSON.stringify({
        host: 'http://' + ip.address() + ':4242',
        id: testId,
        from: 'ubuntu',
        inspectData: {
          Config: {
            Labels: {
              instanceId: '5633e9273e2b5b0c0077fd41',
              contextVersionId: '563a808f9359ef0c00df34e6'
            }
          }
        }
      }));
    });
  }); // end runnable:docker:events:start
}); // end functional test
