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
var fs = require('fs');
var Hermes = require('runnable-hermes');
var nock = require('nock');
var path = require('path');

var publishedEvents = [
  'container.life-cycle.died',
  'container.life-cycle.started',
  'docker.events-stream.connected'
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
var WeaveWrapper = require('../../lib/models/weave-wrapper.js');

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
      sinon.spy(WeaveWrapper, '_runCmd');
      mavisNock = nock(process.env.MAVIS_URL);
      fs.unlink('./weaveMockArgs', function () {
        fs.unlink('./weaveEnvs', function () {
          done();
        });
      });
    });

    afterEach(function (done) {
      WeaveWrapper._runCmd.restore();
      Start.shutdown(done);
    });

    it('should launch weave for each docker host with correct peers', function (done) {
      mavisNock
        .get('/docks')
        .times(4)
        .reply(200, [{
          'numContainers': 1,
          'numBuilds': 5,
          'host': 'http://1.0.0.1:4242',
          'tags': 'one,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://2.0.0.1:4242',
          'tags': 'two,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://2.0.0.2:4242',
          'tags': 'two,run,build'
        }]);

      Start.startup(check);

      function check () {
        try {
          expect(WeaveWrapper._runCmd.callCount).to.equal(3);
        } catch (err) {
          return setTimeout(check, 100);
        }
        console.log('WeaveWrapper._runCmd.args', WeaveWrapper._runCmd.args);
        var d1 = WeaveWrapper._runCmd.args.filter(function (args) {
          return args[1] === '1.0.0.1:4242';
        })[0];
        expect(d1[0]).to.contain('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16');

        var d2 = WeaveWrapper._runCmd.args.filter(function (args) {
          return args[1] === '2.0.0.1:4242';
        })[0];
        expect(d2[0]).to.contain('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16 2.0.0.2');

        var d3 = WeaveWrapper._runCmd.args.filter(function (args) {
          return args[1] === '2.0.0.2:4242';
        })[0];
        expect(d3[0]).to.contain('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16 2.0.0.1');
        done();
      }
    });
  }); // end runnable:docker:events:start
}); // end functional test