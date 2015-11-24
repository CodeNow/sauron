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
      fs.unlink('./weaveMockArgs', function () {
        fs.unlink('./weaveEnvs', function () {
          done();
        });
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
          'tags': 'runnable,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://10.0.233.23:4242',
          'tags': 'runnable,run,build'
        }]);
    });

    it('should launch weave with no peers on container death', function (done) {
      testPublisher.publish('container.life-cycle.died', {
        host: 'http://10.0.202.22:4242',
        id: '237c9ccf14e89a6e23fb15f2d9132efd98878f6267b9f128f603be3b3e362472',
        from: 'weaveworks/weave:1.2.0',
        tags: 'testOrg,build,run',
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
        var weaveArgs;
        var weaveEnvs;
        try {
          weaveArgs = fs.readFileSync('./weaveMockArgs');
          weaveEnvs = fs.readFileSync('./weaveEnvs');
        } catch (err) {
          return setTimeout(check, 100);
        }
        expect(weaveArgs.toString()).to.equal('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16\n');
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=10.0.202.22:4242');

        done();
      }
    });

    it('should launch weave with peers on container death', function (done) {
      testPublisher.publish('container.life-cycle.died', {
        host: 'http://10.0.233.186:4242',
        id: '237c9ccf14e89a6e23fb15f2d9132efd98878f6267b9f128f603be3b3e362472',
        from: 'weaveworks/weave:1.2.0',
        tags: 'runnable,build,run',
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
        var weaveArgs;
        var weaveEnvs;
        try {
          weaveArgs = fs.readFileSync('./weaveMockArgs');
          weaveEnvs = fs.readFileSync('./weaveEnvs');
        } catch (err) {
          return setTimeout(check, 100);
        }
        expect(weaveArgs.toString()).to.equal('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16 10.0.233.23\n');
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=10.0.233.186:4242');

        done();
      }
    });
  }); // end container.life-cycle.died

  describe('weave.start', function () {
    beforeEach(function (done) {
      fs.unlink('./weaveMockArgs', function () {
        fs.unlink('./weaveEnvs', function () {
          done();
        });
      });
      nock(process.env.MAVIS_URL)
        .get('/docks')
        .reply(200, [{
          'numContainers': 1,
          'numBuilds': 5,
          'host': 'http://10.2.2.2:4242',
          'tags': 'runnable,build,run'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://10.0.233.186:4242',
          'tags': '1660575,run,build'
        }]);
    });

    it('should launch weave container on host with no peers', function (done) {
      testPublisher.publish('weave.start', {
        dockerUri: 'http://10.2.2.2:4242',
        orgId: 'runnable'
      });
      check();
      function check () {
        var weaveArgs;
        var weaveEnvs;
        try {
          weaveArgs = fs.readFileSync('./weaveMockArgs');
          weaveEnvs = fs.readFileSync('./weaveEnvs');
        } catch (err) {
          return setTimeout(check, 100);
        }
        expect(weaveArgs.toString()).to.equal('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16\n');
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=10.2.2.2:4242');
        done();
      }
    });
  }); // end weave.start

  describe('container.life-cycle.started', function () {
    beforeEach(function (done) {
      fs.unlink('./weaveMockArgs', function () {
        fs.unlink('./weaveEnvs', function () {
          done();
        });
      });
    });

    it('should call weave attach on container and emit event', function (done) {
      var testId = 'Andune';
      testSubscriber.subscribe('container.network.attached', function (data, cb) {
        expect(data.id).to.equal(testId);
        expect(data.host).to.equal('http://1.1.1.1:4242');
        expect(data.containerIp).to.equal('10.0.17.38');
        expect(data.inspectData.Config.Labels.instanceId).to.equal('5633e9273e2b5b0c0077fd41');
        var weaveArgs = fs.readFileSync('./weaveMockArgs');
        expect(weaveArgs.toString()).to.equal('attach Andune\n');
        var weaveEnvs = fs.readFileSync('./weaveEnvs');
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=1.1.1.1:4242');
        cb();
        done();
      });
      testPublisher.publish('container.life-cycle.started', {
        host: 'http://1.1.1.1:4242',
        id: testId,
        from: 'ubuntu',
        tags: 'tag,your,it',
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
        expect(data.host).to.equal('http://2.3.4.5:4242');
        expect(data.err.data.err.stderr).to.equal('container died\n');
        expect(data.inspectData.Config.Labels.instanceId).to.equal('5633e9273e2b5b0c0077fd41');
        var weaveArgs = fs.readFileSync('./weaveMockArgs');
        expect(weaveArgs.toString()).to.equal('died-attach attach Andune\n');
        var weaveEnvs = fs.readFileSync('./weaveEnvs');
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=2.3.4.5:4242');
        cb();
        done();
      });
      testPublisher.publish('container.life-cycle.started', {
        host: 'http://2.3.4.5:4242',
        id: testId,
        from: 'ubuntu',
        tags: 'tag,your,it',
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
        fs.unlink('./weaveMockArgs', function () {
          fs.unlink('./weaveEnvs', function () {
            done();
          });
        });
      });

      it('should retry weave attach on fail and emit event on success', function (done) {
        var testId = 'Andune';
        process.env.WEAVE_PATH = path.resolve(__dirname, '../fixtures/weaveMock retry-attach');
        testSubscriber.subscribe('container.network.attached', function (data, cb) {
          expect(data.id).to.equal(testId);
          expect(data.host).to.equal('http://9.9.9.9:4242');
          expect(data.containerIp).to.equal('10.0.17.38');
          expect(data.inspectData.Config.Labels.instanceId).to.equal('5633e9273e2b5b0c0077fd41');
          var weaveArgs = fs.readFileSync('./weaveMockArgs');
          expect(weaveArgs.toString()).to.equal('retry-attach attach Andune\n');
          var weaveEnvs = fs.readFileSync('./weaveEnvs');
          expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
          expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
          expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=9.9.9.9:4242');
          cb();
          done();
        });
        testPublisher.publish('container.life-cycle.started', {
          host: 'http://9.9.9.9:4242',
          id: testId,
          from: 'ubuntu',
          tags: 'tag,your,it',
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
