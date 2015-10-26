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
var path = require('path');
var rollbar = require('rollbar');
var fs = require('fs');
var redis = require('redis');
var ip = require('ip');

var testRedisClient = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_IPADDRESS);

var Start = require('../../lib/start.js');

describe('events functional test', function () {
  beforeEach(function (done) {
    sinon.stub(rollbar, 'handleErrorWithPayloadData').yieldsAsync();
    process.env.WEAVE_PATH = path.resolve(__dirname, '../fixtures/weaveMock');
    process.env.ORG_ID = '1234124';
    testRedisClient.flushdb(done);
  });

  afterEach(function (done) {
    rollbar.handleErrorWithPayloadData.restore();
    delete process.env.ORG_ID;
    done();
  });

  describe('weave launch', function () {
    beforeEach(function (done) {
      fs.unlink('./weaveMockArgsLaunch', function () {
        done();
      });
    });

    afterEach(function (done) {
      Start.shutdown(done);
    });

    it('should launch weave and add self to redis', function (done) {
      Start.startup(function () {
        testRedisClient.smembers(
          process.env.WEAVE_PEER_NAMESPACE + process.env.ORG_ID, function (err, keys) {
          var weaveInput = fs.readFileSync('./weaveMockArgsLaunch');
          expect(weaveInput.toString())
            .to.equal('launch-router --no-dns --ipalloc-range 10.0.0.0/8 --ipalloc-default-subnet 10.0.0.0/8\n');
            expect(keys).to.contain(ip.address());
          done();
        });
      });
    });

    it('should launch weave and add self to redis', function (done) {
      var key = process.env.WEAVE_PEER_NAMESPACE + process.env.ORG_ID;
      testRedisClient.sadd(key, '10.22.33.44', function () {
        Start.startup(function () {
          testRedisClient.smembers(key, function (err, keys) {
            var weaveInput = fs.readFileSync('./weaveMockArgsLaunch');
            expect(weaveInput.toString())
              .to.equal('launch-router --no-dns --ipalloc-range 10.0.0.0/8 --ipalloc-default-subnet 10.0.0.0/8 10.22.33.44\n');
              expect(keys).to.contain(ip.address());
            done();
          });
        });
      });
    });
  }); // end runnable:docker:events:start
}); // end functional test