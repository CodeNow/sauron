 'use strict';
require('../../lib/loadenv.js')();
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var mock = require('../../lib/executors/mock.js');
var weaver = require('../../lib/models/weaver.js');
var redis = require('../../lib/models/redis.js');
var docker = require('../fixtures/docker.js');
var dockerClient = docker.client;

lab.experiment('/lib/models/weaver.js unit test', function () {
  lab.beforeEach(function (done) {
    redis.flushdb(done);
  });
  lab.beforeEach(docker.start);
  lab.afterEach(docker.stop);
  lab.beforeEach(mock.reset);
  lab.experiment('normal commands', function () {
    lab.experiment('setup', function () {
      lab.test('setup alone', function (done) {
        weaver.setup(done);
      });
     lab.test('setup error', function (done) {
        mock.set('launch', function(){
          var cb = arguments[arguments.length-1];
          cb('some start err');
        });
        weaver.setup(function(err) {
          Lab.expect(err.message).to.equal('weave launch failed');
          done();
        });
      });
     lab.test('should launch with peers and password', function (done) {
        redis.sadd(process.env.WEAVE_NETWORKS+':'+process.env.WEAVE_PEERS, '10.0.0.1', '10.0.0.2',
          function(err) {
            if (err) { return done(err); }
            mock.set('launch', function(){
              var args = Array.prototype.slice.call(arguments, 0);
              Lab.expect(args[0]).to.equal('-password');
              Lab.expect(args[1]).to.equal(process.env.WEAVE_PASSWORD);
              Lab.expect(args).to.contain('10.0.0.1');
              Lab.expect(args).to.contain('10.0.0.2');
              done();
            });
            weaver.setup(function(){});
          });
      });
      lab.test('setup weave when already setup should not throw error', function (done) {
        weaver.setup(function (err) {
          if (err) { return done(err); }
          weaver.setup(done);
        });
      });
      lab.test('should clear ip if failed to launch', function (done) {
        weaver.setup(function (err) {
          if (err) { return done(err); }
          redis.smembers(process.env.WEAVE_NETWORKS+':'+process.env.WEAVE_PEERS,
            function (err, data) {
              if (err) { return done(err); }
              Lab.expect(data).to.have.length(1);
              Lab.expect(data).to.have.contain(ip.address());
              done();
          });
        });
      });
    });
   lab.test('setup after peer already set', function (done) {
      redis.sadd(process.env.WEAVE_NETWORKS+':'+process.env.WEAVE_PEERS, ip.address(),
        function (err) {
          if (err) { return done(err); }
          weaver.setup(function (err) {
            if (err) { return done(err); }
            redis.smembers(process.env.WEAVE_NETWORKS+':'+process.env.WEAVE_PEERS,
              function (err, data) {
                if (err) { return done(err); }
                Lab.expect(data).to.have.length(1);
                done();
            });
          });
        });
    });
    lab.experiment('attachContainer', function () {
      var containerId;
      lab.beforeEach(function(done) {
        dockerClient.createContainer({Image: 'ubuntu', Cmd: ['/bin/bash'], name: 'ubuntu-test'},
          function (err, container) {
            if (err) { return done(err); }
            containerId = container.id;
            container.start(done);
          });
      });
      lab.test('normal', function (done) {
        weaver.attachContainer(containerId, '10.0.0.0', '32', false, function (err) {
          if (err) { return done(err); }
          containerIp.getContainerIp(containerId, function(err, data) {
            if (err) { return done(err); }
            Lab.expect(data).to.equal('10.0.0.0');
            done();
          });
        });
      });
      lab.test('should err if attach to 2 diff IP to same container', function (done) {
        weaver.attachContainer(containerId, '10.0.0.0', '32', false, function (err) {
          if (err) { return done(err); }
          weaver.attachContainer(containerId, '10.0.0.1', '32', false, function (err) {
            Lab.expect(err.message).to.equal('container is mapped to a different IP');
            done();
          });
        });
      });
      lab.test('should pass if attach to 2 diff IP to same container with force', function (done) {
        weaver.attachContainer(containerId, '10.0.0.0', '32', false, function (err) {
          if (err) { return done(err); }
          weaver.attachContainer(containerId, '10.0.0.1', '32', true, function (err) {
            Lab.expect(err.message).to.equal('container is mapped to a different IP');
            done();
          });
        });
      });
      lab.test('should err if attaching IP to diff container', function (done) {
        weaver.attachContainer(containerId, '10.0.0.0', '32', false, function (err) {
          if (err) { return done(err); }
          weaver.attachContainer(containerId+'1', '10.0.0.0', '32', false, function (err) {
            Lab.expect(err.message).to.equal('ip already mapped to a container');
            done();
          });
        });
      });
      lab.test('missing ipaddr', function (done) {
        weaver.attachContainer(containerId, null, '32', false, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing subnet', function (done) {
        weaver.attachContainer(containerId, '32', null, false, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing containerId', function (done) {
        weaver.attachContainer(null, '10.0.0.0', '32', false, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing all', function (done) {
        weaver.attachContainer(null, null, null, false, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('attach to non existing container', function (done) {
        weaver.attachContainer('FAKEID', '10.0.0.0', '32', false, function(err) {
          Lab.expect(err.message).to.match(new RegExp('Error: No such image or container: FAKEID'));
          done();
        });
      });
      lab.test('attach to stopped container', function (done) {
        dockerClient.getContainer(containerId).stop(function(err) {
          if (err) { return done(err); }
          weaver.attachContainer(containerId, '10.0.0.0', '32', false, function(err) {
            Lab.expect(err.message).to.match(new RegExp('Container '+containerId+' not running'));
            done();
          });
        });
      });
    }); // attachContainer

    lab.experiment('detachContainer', function () {
      var containerId;
      lab.beforeEach(function(done) {
        dockerClient.createContainer({Image: 'ubuntu', Cmd: ['/bin/bash'], name: 'ubuntu-test'},
          function (err, container) {
            if (err) { return done(err); }
            containerId = container.id;
            container.start(done);
          });
      });
      lab.test('should error if nothing attached', function (done) {
        weaver.detachContainer(containerId, '10.0.0.0', '32', false, function (err) {
          Lab.expect(err.message).to.equal('container is not mapped to an ip');
          done();
        });
      });
      lab.test('missing ipaddr', function (done) {
        weaver.detachContainer(containerId, null, '32', false, function (err) {
          Lab.expect(err.message).to.equal('container is not mapped to an ip');
          done();
        });
      });
      lab.test('missing subnet', function (done) {
        weaver.detachContainer(containerId, '32', null, false, function (err) {
          Lab.expect(err.message).to.equal('container is not mapped to an ip');
          done();
        });
      });
      lab.test('missing containerId', function (done) {
        weaver.detachContainer(null, '10.0.0.0', '32', false, function (err) {
          Lab.expect(err.message).to.equal('container is not mapped to an ip');
          done();
        });
      });
      lab.test('missing all', function (done) {
        weaver.detachContainer(null, null, null, false, function (err) {
          Lab.expect(err.message).to.equal('container is not mapped to an ip');
          done();
        });
      });
      lab.test('should error if detach to incorrect container', function (done) {
        weaver.attachContainer(containerId, '10.0.0.0', '32', false, function(err) {
          if (err) { return done(err); }
          weaver.detachContainer('different', '10.0.0.0', '32', false, function (err) {
            Lab.expect(err.message).to.equal('ip is mapped to a different container');
            done();
          });
        });
      });
      lab.test('should pass if detach to incorrect container with force', function (done) {
        weaver.attachContainer(containerId, '10.0.0.0', '32', false, function(err) {
          if (err) { return done(err); }
          weaver.detachContainer(containerId, '10.0.0.0', '32', true, done);
        });
      });
      lab.test('detach to non existing container', function (done) {
        weaver.attachContainer(containerId, '10.0.0.0', '32', false, function(err) {
          if (err) { return done(err); }
          dockerClient.getContainer(containerId).remove(function(err) {
            if (err) { return done(err); }
            weaver.detachContainer(containerId, '10.0.0.0', '32', false, function(err) {
              Lab.expect(err.message)
                .to.match(new RegExp('Error: No such image or container: '+containerId));
              done();
            });
          });
        });
      });
      lab.test('detach to stopped container', function (done) {
        weaver.attachContainer(containerId, '10.0.0.0', '32', false, function(err) {
          if (err) { return done(err); }
          dockerClient.getContainer(containerId).stop(function(err) {
            if (err) { return done(err); }
            weaver.detachContainer(containerId, '10.0.0.0', '32', false, function(err) {
              Lab.expect(err.message).to.match(new RegExp('Container '+containerId+' not running'));
              done();
            });
          });
        });
      });
    }); // attachContainer

  }); // weave depended command
});