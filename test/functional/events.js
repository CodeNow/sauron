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
var fs = require('fs');
var Hermes = require('runnable-hermes');
var nock = require('nock');

var publishedEvents = [
  'container.life-cycle.died',
  'container.life-cycle.started'
];

var subscribedEvents = [
  'container.network.attached',
  'container.network.attach-failed'
];

var queues = [
  'weave.start'
];

var testPublisher = new Hermes({
    hostname: process.env.RABBITMQ_HOSTNAME,
    password: process.env.RABBITMQ_PASSWORD,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    publishedEvents: publishedEvents,
    queues: queues,
    name: 'testPublisher'
  });

var testSubscriber = new Hermes({
    hostname: process.env.RABBITMQ_HOSTNAME,
    password: process.env.RABBITMQ_PASSWORD,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    subscribedEvents: subscribedEvents,
    queues: queues,
    name: 'testSubscriber'
  });

var WeaveSetup = require('../../lib/models/weave-setup.js');
var Start = require('../../lib/start.js');

describe('events functional test', function () {
  beforeEach(function (done) {
    testPublisher.connect(done);
  });

  beforeEach(function (done) {
    process.env.WEAVE_PATH = path.resolve(__dirname, '../fixtures/weaveMock');
    // need to nock 3 times
    // once for initial setup
    // two for each weave start job
    nock(process.env.MAVIS_URL)
      .get('/docks')
      .times(3)
      .reply(200, [{
        'numContainers': 1,
        'numBuilds': 5,
        'host': 'http://10.0.202.22:4242',
        'tags': '1738,run,build'
      }, {
        'numContainers': 1,
        'numBuilds': 1,
        'host': 'http://10.0.233.186:4242',
        'tags': '1660575,run,build'
      }]);
    Start.startup(done);
  });

  beforeEach(function (done) {
    testSubscriber.connect(done);
  });

  afterEach(function (done) {
    Start.shutdown(done);
  });

  afterEach(function (done) {
    testPublisher.close(done);
  });

  afterEach(function (done) {
    testSubscriber.close(done);
  });

  describe('container.life-cycle.died', function () {
    beforeEach(function (done) {
      process.env.ORG_ID = 'testOrg';

      fs.unlink('./weaveMockArgs', function () {
        done();
      });
      nock(process.env.MAVIS_URL)
        .get('/docks')
        .reply(200, [{
          'numContainers': 1,
          'numBuilds': 5,
          'host': 'http://10.0.202.22:4242',
          'tags': 'testOrg,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://10.0.233.186:4242',
          'tags': '1660575,run,build'
        }]);
    });

    afterEach(function (done) {
      delete process.env.ORG_ID;
      done();
    });

    it('should launch weave with no peers on container death', function (done) {
      process.env.ORG_ID = 'nopeers';

      testPublisher.publish('container.life-cycle.died', {
        host: 'http://localhost:4242',
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
      });

      check();
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

    it('should launch weave with peers on container death', function (done) {
      testPublisher.publish('container.life-cycle.died', {
        host: 'http://localhost:4242',
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
      });

      check();
      function check () {
        var weaveInput;
        try {
          weaveInput = fs.readFileSync('./weaveMockArgs');
        } catch (err) {
          return setTimeout(check, 100);
        }
        expect(weaveInput.toString())
          .to.equal('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16 10.0.202.22\n');
        done();
      }
    });
  }); // end container.life-cycle.died

  describe('weave.start', function () {
    beforeEach(function (done) {
      process.env.ORG_ID = 'testOrg';

      fs.unlink('./weaveMockArgs', function () {
        done();
      });
      nock(process.env.MAVIS_URL)
        .get('/docks')
        .reply(200, [{
          'numContainers': 1,
          'numBuilds': 5,
          'host': 'http://10.0.202.22:4242',
          'tags': '55555,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://10.0.233.186:4242',
          'tags': '1660575,run,build'
        }]);
    });

    afterEach(function (done) {
      delete process.env.ORG_ID;
      done();
    });

    it('should setup weave', function (done) {
      testPublisher.publish('weave.start', {
        dockerHost: 'http://10.2.2.2:4242'
      });
      check();
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
  }); // end weave.start

  describe('container.life-cycle.started', function () {
    beforeEach(function (done) {
      fs.unlink('./weaveMockArgs', function () {
        done();
      });
    });

    it('should call weave attach on container and emit event', function (done) {
      var testId = 'Andune';
      testSubscriber.subscribe('container.network.attached', function (data, cb) {
        expect(data.id).to.equal(testId);
        expect(data.host).to.equal('http://localhost:4242');
        expect(data.containerIp).to.equal('10.0.17.38');
        expect(data.inspectData.Config.Labels.instanceId).to.equal('5633e9273e2b5b0c0077fd41');
        var weaveInput = fs.readFileSync('./weaveMockArgs');
        expect(weaveInput.toString()).to.equal('attach Andune\n');
        cb();
        done();
      });
      testPublisher.publish('container.life-cycle.started', {
        host: 'http://localhost:4242',
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
      });
    });

    it('should call emit fail if attach failed', function (done) {
      var testId = 'Andune';
      process.env.WEAVE_PATH = path.resolve(__dirname, '../fixtures/weaveMock died-attach');
      testSubscriber.subscribe('container.network.attach-failed', function (data, cb) {
        expect(data.id).to.equal(testId);
        expect(data.host).to.equal('http://localhost:4242');
        expect(data.err.data.err.stderr).to.equal('container died\n');
        expect(data.inspectData.Config.Labels.instanceId).to.equal('5633e9273e2b5b0c0077fd41');
        var weaveInput = fs.readFileSync('./weaveMockArgs');
        expect(weaveInput.toString()).to.equal('died-attach attach Andune\n');
        cb();
        done();
      });
      testPublisher.publish('container.life-cycle.started', {
        host: 'http://localhost:4242',
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
      });
    });

    describe('attach retry', function () {
      beforeEach(function (done) {
        fs.unlink('./attempt', function () {
          done();
        });
      });

      it('should retry weave attach on fail and emit event on success', function (done) {
        var testId = 'Andune';
        process.env.WEAVE_PATH = path.resolve(__dirname, '../fixtures/weaveMock retry-attach');
        testSubscriber.subscribe('container.network.attached', function (data, cb) {
          expect(data.id).to.equal(testId);
          expect(data.host).to.equal('http://localhost:4242');
          expect(data.containerIp).to.equal('10.0.17.38');
          expect(data.inspectData.Config.Labels.instanceId).to.equal('5633e9273e2b5b0c0077fd41');
          var weaveInput = fs.readFileSync('./weaveMockArgs');
          expect(weaveInput.toString()).to.equal('retry-attach attach Andune\n');
          cb();
          done();
        });
        testPublisher.publish('container.life-cycle.started', {
          host: 'http://localhost:4242',
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
        });
      });
    }); // end attach retry
  }); // end container.life-cycle.started
}); // end functional test
