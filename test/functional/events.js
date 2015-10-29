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
var rollbar = require('rollbar');
var fs = require('fs');
var hermesClient = require('runnable-hermes');

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
    queues: [ 'container-network-attached' ]
  })
  .connect();

var Start = require('../../lib/start.js');

describe('events functional test', function () {
  beforeEach(function (done) {
    sinon.stub(rollbar, 'handleErrorWithPayloadData').yieldsAsync();
    testRedisClient.flushdb(done);
  });

  beforeEach(function (done) {
    process.env.WEAVE_PATH = path.resolve(__dirname, '../fixtures/weaveMock');
    Start.startup(done);
  });

  afterEach(function (done) {
    Start.shutdown(done);
    rollbar.handleErrorWithPayloadData.restore();
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
      fs.unlink('./weaveMockArgsAttach', function () {
        done();
      });
    });

    it('should call weave attach on container and emit event', function (done) {
      var testId = 'Andune';
      testRabbit.subscribe('container-network-attached', function (data, cb) {
        expect(data.containerId).to.equal(testId);
        expect(data.host).to.equal('http://' + ip.address() + ':4242');
        expect(data.containerIp).to.equal('10.0.17.38');
        var weaveInput = fs.readFileSync('./weaveMockArgsAttach');
        expect(weaveInput.toString()).to.equal('attach Andune\n');
        cb();
        done();
      });
      testRedisPubSub.publish('runnable:docker:events:start', JSON.stringify({
        host: 'http://' + ip.address() + ':4242',
        id: testId,
        from: 'ubuntu'
      }));
    });
  }); // end runnable:docker:events:start
}); // end functional test