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

var fs = require('fs');
var Hermes = require('runnable-hermes');
var nock = require('nock');
var path = require('path');

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
    done();
  });

  afterEach(function (done) {
    delete process.env.ORG_ID;
    done();
  });

  afterEach(function (done) {
    testPublisher.close(done);
  });

  describe('weave launch', function () {
    var mavisNock;
    beforeEach(function (done) {
      mavisNock = nock(process.env.MAVIS_URL);
      fs.unlink('./weaveMockArgs', function () {
        fs.unlink('./weaveEnvs', function () {
          done();
        });
      });
    });

    afterEach(function (done) {
      Start.shutdown(done);
    });

    it('should launch weave for each docker host with correct peers', function (done) {
      mavisNock
        .get('/docks')
        .times(4)
        .reply(200, [{
          'numContainers': 1,
          'numBuilds': 5,
          'host': 'http://10.0.202.22:4242',
          'tags': 'one,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://10.0.233.186:4242',
          'tags': 'two,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://10.0.233.186:4242',
          'tags': 'two,run,build'
        }]);

      Start.startup(check);

      function check () {
        var weaveInput;
        try {
          weaveInput = fs.readFileSync('./weaveMockArgs');
        } catch (err) {
          return setTimeout(check, 100);
        }
        expect(weaveInput.toString())
          .to.equal('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16\n');
        done();
      }
    });
  }); // end runnable:docker:events:start
}); // end functional test