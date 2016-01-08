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
  'container.life-cycle.started',
  'docker.events-stream.connected'
];

var subscribedEvents = [
  'container.network.attached'
];
var publishQueues = [
  'on-dock-unhealthy',
  'weave.start'
];

var subscribeQueues = [
  'weave.start'
];

var testPublisher = new Hermes({
    hostname: process.env.RABBITMQ_HOSTNAME,
    password: process.env.RABBITMQ_PASSWORD,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    publishedEvents: publishedEvents,
    queues: publishQueues,
    name: 'testPublisher'
  });

var testSubscriber = new Hermes({
    hostname: process.env.RABBITMQ_HOSTNAME,
    password: process.env.RABBITMQ_PASSWORD,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    subscribedEvents: subscribedEvents,
    queues: subscribeQueues,
    name: 'testSubscriber'
  });

var Start = require('../../lib/start.js');
var WeaveWrapper = require('../../lib/models/weave-wrapper.js');

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
        'host': 'http://1.1.1.1:4242',
        'tags': '1738,run,build'
      }, {
        'numContainers': 1,
        'numBuilds': 1,
        'host': 'http://2.2.2.2:4242',
        'tags': '1660575,run,build'
      }]);
    sinon.spy(WeaveWrapper, '_runCmd');
    Start.startup(done);
  });

  beforeEach(function (done) {
    check();
    function check () {
      try {
        expect(WeaveWrapper._runCmd.callCount).to.equal(2);
      } catch (err) {
        return setTimeout(check, 100);
      }
      done();
    }
  });

  beforeEach(function (done) {
    testSubscriber.connect(done);
  });

  afterEach(function (done) {
    WeaveWrapper._runCmd.restore();
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
          'host': 'http://1.1.1.1:4242',
          'tags': 'testOrg,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://2.2.2.2:4242',
          'tags': 'runnable,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://3.3.3.3:4242',
          'tags': 'runnable,run,build'
        }]);
    });

    it('should launch weave with no peers on container death', function (done) {
      testPublisher.publish('container.life-cycle.died', {
        host: 'http://1.1.1.1:4242',
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
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=1.1.1.1:4242');

        done();
      }
    });

    it('should launch weave with peers on container death', function (done) {
      testPublisher.publish('container.life-cycle.died', {
        host: 'http://2.2.2.2:4242',
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
        expect(weaveArgs.toString()).to.equal('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16 3.3.3.3\n');
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=2.2.2.2:4242');

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
          'host': 'http://2.2.2.2:4242',
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
      // nock for host check
      nock(process.env.MAVIS_URL)
        .get('/docks')
        .reply(200, [{
          'numContainers': 1,
          'numBuilds': 5,
          'host': 'http://1.1.1.1:4242',
          'tags': 'runnable,build,run'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://2.3.4.5:4242',
          'tags': '1660575,run,build'
        }]);
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
  }); // end container.life-cycle.started

  describe('attach retry', function () {
    beforeEach(function (done) {
      fs.unlink('./weaveMockArgs', function () {
        fs.unlink('./weaveEnvs', function () {
          done();
        });
      });
      // nock for host check
      nock(process.env.MAVIS_URL)
        .get('/docks')
        .times(2)
        .reply(200, [{
          'numContainers': 1,
          'numBuilds': 5,
          'host': 'http://1.1.1.1:4242',
          'tags': 'runnable,build,run'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://2.3.4.5:4242',
          'tags': '1660575,run,build'
        }]);
    });

    it('should retry weave attach on fail and emit event on success', function (done) {
      var testId = 'Andune';
      process.env.WEAVE_PATH = path.resolve(__dirname, '../fixtures/weaveMock retry-attach');
      testSubscriber.subscribe('container.network.attached', function (data, cb) {
        expect(data.id).to.equal(testId);
        expect(data.host).to.equal('http://2.3.4.5:4242');
        expect(data.containerIp).to.equal('10.0.17.38');
        expect(data.inspectData.Config.Labels.instanceId).to.equal('5633e9273e2b5b0c0077fd41');
        var weaveArgs = fs.readFileSync('./weaveMockArgs');
        expect(weaveArgs.toString()).to.equal('retry-attach attach Andune\n');
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
  }); // end attach retry

  describe('docker.events-stream.connected', function () {
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
          'host': 'http://1.1.1.1:4242',
          'tags': 'testOrg,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://2.2.2.2:4242',
          'tags': 'runnable,run,build'
        }, {
          'numContainers': 1,
          'numBuilds': 1,
          'host': 'http://3.3.3.3:4242',
          'tags': 'runnable,run,build'
        }]);
    });

    it('should launch weave with no peers on dock up', function (done) {
      testPublisher.publish('docker.events-stream.connected', {
        host: 'http://1.1.1.1:4242',
        tags: 'testOrg,build,run'
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
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=1.1.1.1:4242');

        done();
      }
    });

    it('should launch weave with peers on dock up', function (done) {
      testPublisher.publish('docker.events-stream.connected', {
        host: 'http://2.2.2.2:4242',
        tags: 'runnable,build,run'
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
        expect(weaveArgs.toString()).to.equal('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16 3.3.3.3\n');
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=2.2.2.2:4242');

        done();
      }
    });
  }); // end docker.events-stream.connected
}); // end functional test
