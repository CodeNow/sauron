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

var path = require('path');
var fs = require('fs');
var Hermes = require('runnable-hermes');
var redis = require('redis');
var ip = require('ip');

var testRedisClient = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_IPADDRESS);

var publishedEvents = [
  'container.life-cycle.died',
  'container.life-cycle.started'
];

var testPublisher = new Hermes({
    hostname: process.env.RABBITMQ_HOSTNAME,
    password: process.env.RABBITMQ_PASSWORD,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    publishedEvents: publishedEvents,
    name: 'testPublisher'
  });

var Start = require('../../lib/start.js');

describe('events functional test', function () {
  beforeEach(function (done) {
    testPublisher.connect(done);
  });

  beforeEach(function (done) {
    process.env.WEAVE_PATH = path.resolve(__dirname, '../fixtures/weaveMock');
    process.env.ORG_ID = '1234124';
    testRedisClient.flushdb(done);
  });

  afterEach(function (done) {
    delete process.env.ORG_ID;
    done();
  });

  afterEach(function (done) {
    testPublisher.close(done);
  });

  describe('weave launch', function () {
    beforeEach(function (done) {
      fs.unlink('./weaveMockArgs', function () {
        done();
      });
    });

    afterEach(function (done) {
      Start.shutdown(done);
    });

    it('should launch weave and add self to redis', function (done) {
      var key = process.env.WEAVE_PEER_NAMESPACE + process.env.ORG_ID;
      Start.startup(check);

      function check () {
        testRedisClient.smembers(
          key, function (err, keys) {
          var weaveInput;
          try {
            weaveInput = fs.readFileSync('./weaveMockArgs');
            expect(weaveInput.toString())
              .to.equal('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16\n');
            expect(keys).to.contain(ip.address());
          } catch (err) {
            return process.nextTick(check);
          }
          done();
        });
      }
    });

    it('should launch weave with peers', function (done) {
      var key = process.env.WEAVE_PEER_NAMESPACE + process.env.ORG_ID;
      testRedisClient.sadd(key, '10.22.33.44', function () {
        Start.startup(check);

        function check () {
          testRedisClient.smembers(key, function (err, keys) {
            var weaveInput;
             try {
              weaveInput = fs.readFileSync('./weaveMockArgs');
              expect(weaveInput.toString())
                .to.equal('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16 10.22.33.44\n');
              expect(keys).to.contain(ip.address());
            } catch (err) {
              return process.nextTick(check);
            }
            done();
          });
        }
      });
    });
  }); // end runnable:docker:events:start
}); // end functional test