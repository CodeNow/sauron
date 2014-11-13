'use strict';
require('../../lib/loadenv.js')();
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var mock = require('../../lib/executors/mock.js');
var weaveWrapper = require('../../lib/engines/weave-wrapper.js');
var docker = require('../fixtures/docker.js');
var dockerClient = docker.client;

lab.experiment('/lib/engines/weave-wrapper.js unit test', function () {
  lab.beforeEach(docker.start);
  lab.afterEach(docker.stop);
  lab.beforeEach(mock.reset);

  lab.experiment('sudo weave depended command', function () {
    lab.experiment('status', function () {
      lab.test('should error if weave not running', function (done) {
        weaveWrapper.status(function (err) {
          Lab.expect(err.message).to.equal('weave is not running.');
          done();
        });
      });
      lab.test('should get status', function (done) {
        var options = {
          password: 'pass',
          peers: []
        };
        weaveWrapper.launch(options, function(err) {
          if (err) { return done(err); }
          weaveWrapper.status(done);
        });
      });
    }); // status
    lab.experiment('launch', function () {
      lab.test('correct launch', function (done) {
        var options = {
          password: 'pass',
          peers: ['10.0.0.1', '10.0.0.2']
        };
        weaveWrapper.launch(options, function (err, data) {
          Lab.expect(data).to.equal(
            'e521bb239e333fb9ed77cf5a63700389a068e470bad00eda06dafa9e8332ade5');
          done();
        });
      });
      lab.test('no peer launch', function (done) {
        var options = {
          password: 'pass',
          peers: []
        };
        weaveWrapper.launch(options, function (err, data) {
          Lab.expect(data).to.equal(
            'e521bb239e333fb9ed77cf5a63700389a068e470bad00eda06dafa9e8332ade5');
          done();
        });
      });
      lab.test('missing password', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32',
          peers: []
        };
        weaveWrapper.launch(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing peers', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32',
          password: 'pass'
        };
        weaveWrapper.launch(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing all', function (done) {
        weaveWrapper.launch(null, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
    }); // launch

    lab.experiment('attach', function () {
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
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32',
          containerId: containerId
        };
        weaveWrapper.attach(options, done);
      });
      lab.test('missing ipaddr', function (done) {
        var options = {
          subnet: '32',
          containerId: containerId
        };
        weaveWrapper.attach(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing subnet', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          containerId: containerId
        };
        weaveWrapper.attach(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing containerId', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32'
        };
        weaveWrapper.attach(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing all', function (done) {
        weaveWrapper.attach(null, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('should error for non existing containers', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32',
          containerId: 'FAKEID'
        };
        weaveWrapper.attach(options, function(err) {
          Lab.expect(err.message).to.match(/Error: No such image or container: FAKEID/);
          done();
        });
      });
      lab.test('should error for stopped containers', function (done) {
        dockerClient.getContainer(containerId).stop(function(err) {
          if (err) { return done(err); }
          var options = {
            ipaddr: '10.0.0.0',
            subnet: '32',
            containerId: containerId
          };
          weaveWrapper.attach(options, function(err) {
            Lab.expect(err.message).to.match(new RegExp('Container '+containerId+' not running'));
            done();
          });
        });
      });
    }); // attach

    lab.experiment('detach', function () {
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
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32',
          containerId: containerId
        };
        weaveWrapper.detach(options, done);
      });
      lab.test('missing ipaddr', function (done) {
        var options = {
          subnet: '32',
          containerId: containerId
        };
        weaveWrapper.detach(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing subnet', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          containerId: containerId
        };
        weaveWrapper.detach(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing containerId', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32'
        };
        weaveWrapper.detach(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing all', function (done) {
        weaveWrapper.detach(null, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('should error for non existing containers', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32',
          containerId: 'FAKEID'
        };
        weaveWrapper.detach(options, function(err) {
          Lab.expect(err.message).to.match(/Error: No such image or container: FAKEID/);
          done();
        });
      });
      lab.test('should error for stopped containers', function (done) {
        dockerClient.getContainer(containerId).stop(function(err) {
          if (err) { return done(err); }
          var options = {
            ipaddr: '10.0.0.0',
            subnet: '32',
            containerId: containerId
          };
          weaveWrapper.detach(options, function(err) {
            Lab.expect(err.message).to.match(new RegExp('Container '+containerId+' not running'));
            done();
          });
        });
      });
    }); // detach

  }); // weave depended command
});