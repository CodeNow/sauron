'use strict';

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var afterEach = lab.afterEach;
var beforeEach = lab.beforeEach;
var Code = require('code');
var expect = Code.expect;

var sinon = require('sinon');
var child_process = require('child_process');

var WeaveWrapper = require('../../../lib/models/weave-wrapper.js');

describe('weave-wrapper.js unit test', function () {
  describe('_runCmd', function () {
    var testCmd = 'sudo rm -rf /all';

    beforeEach(function (done) {
      sinon.stub(child_process, 'exec');
      done();
    });

    afterEach(function (done) {
      child_process.exec.restore();
      done();
    });

    it('should output stdout', function (done) {
      var testStdout = 'all deleted';
      var testEnv = 'env test';

      child_process.exec.yieldsAsync(undefined, testStdout);
      WeaveWrapper._runCmd(testCmd, testEnv, function (err, stdout) {
        expect(err).to.not.exist();
        expect(stdout).to.equal(testStdout);
        expect(child_process.exec.withArgs(testCmd, {
          env: testEnv
        }).called)
          .to.be.true();
        done();
      });
    });

    it('should cb err with stderr', function (done) {
      var testStderr = 'all deleted';
      var testEnv = 'env test';

      child_process.exec.yieldsAsync(new Error('gone'), '', testStderr);
      WeaveWrapper._runCmd(testCmd, testEnv, function (err) {
        expect(err).to.exist();
        expect(err.stderr).to.equal(testStderr);
        expect(child_process.exec.withArgs(testCmd, {
          env: testEnv
        }).called)
          .to.be.true();
        done();
      });
    });
  }); // end _runCmd

  describe('launch', function () {
    var testDockerHost = '10.0.0.1:4242';

    beforeEach(function (done) {
      WeaveWrapper.certs = {
        cert: 'test'
      };
      sinon.stub(WeaveWrapper, '_runCmd');
      sinon.stub(WeaveWrapper, '_handleCmdResult');
      process.env.WEAVE_PATH = '/usr/bin/weave';
      process.env.WEAVE_IP_RANGE = '10.0.0.0/8';
      done();
    });

    afterEach(function (done) {
      delete WeaveWrapper.certs;
      WeaveWrapper._runCmd.restore();
      WeaveWrapper._handleCmdResult.restore();
      delete process.env.WEAVE_PATH;
      delete process.env.WEAVE_IP_RANGE;
      done();
    });

    it('should launch with peers', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper._handleCmdResult.returnsArg(0);
      var peers = ['10.0.0.1', '10.0.0.2'];

      WeaveWrapper.launch(peers, testDockerHost, function (err) {
        expect(err).to.not.exist();
        expect(WeaveWrapper._runCmd
          .withArgs('/usr/bin/weave launch-router --no-dns ' +
            '--ipalloc-range 10.0.0.0/8 --ipalloc-default-subnet 10.0.0.0/8 ' +
            '10.0.0.1 10.0.0.2', {
              DOCKER_HOST: 'tcp://' + testDockerHost,
              cert: 'test'
            }).called)
          .to.be.true();
        done();
      });
    });

    it('should launch without peers', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper._handleCmdResult.returnsArg(0);
      var peers = [];

      WeaveWrapper.launch(peers, testDockerHost, function (err) {
        expect(err).to.not.exist();
        expect(WeaveWrapper._runCmd
          .withArgs('/usr/bin/weave launch-router --no-dns ' +
            '--ipalloc-range 10.0.0.0/8 --ipalloc-default-subnet 10.0.0.0/8', {
              DOCKER_HOST: 'tcp://' + testDockerHost,
              cert: 'test'
            })
          .called).to.be.true();
        done();
      });
    });

    it('should fail if invalid peers', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper._handleCmdResult.returnsArg(0);
      var peers = 'no valid';
      WeaveWrapper.launch(peers, testDockerHost, function (err) {
        expect(err.output.statusCode).to.equal(400);
        done();
      });
    });

    it('should fail if missing peers', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper._handleCmdResult.returnsArg(0);
      WeaveWrapper.launch(null, testDockerHost, function (err) {
        expect(err.output.statusCode).to.equal(400);
        done();
      });
    });
  }); // launch

  describe('attach', function () {
    var testContainerId = '1738';
    var testDockerHost = '10.2.2.2:4242';

    beforeEach(function (done) {
      WeaveWrapper.certs = {
        cert: 'test'
      };
      sinon.stub(WeaveWrapper, '_runCmd');
      sinon.stub(WeaveWrapper, '_handleCmdResult');
      process.env.WEAVE_PATH = '/usr/bin/weave';
      done();
    });

    afterEach(function (done) {
      delete WeaveWrapper.certs;
      WeaveWrapper._runCmd.restore();
      WeaveWrapper._handleCmdResult.restore();
      delete process.env.WEAVE_PATH;
      done();
    });

    it('should attach', function (done) {
      WeaveWrapper._runCmd.yieldsAsync(null, '10.0.0.0\n');
      WeaveWrapper._handleCmdResult.returnsArg(0);

      WeaveWrapper.attach(testContainerId, testDockerHost, function (err) {
        expect(err).to.not.exist();
        expect(WeaveWrapper._runCmd
          .withArgs('/usr/bin/weave attach ' + testContainerId, {
            DOCKER_HOST: 'tcp://' + testDockerHost,
            cert: 'test'
          }).called).to.be.true();
        done();
      });
    });

    it('should fail if invalid ip', function (done) {
      WeaveWrapper._runCmd.yieldsAsync(null, 'not an ip\n');
      WeaveWrapper._handleCmdResult.returnsArg(0);

      WeaveWrapper.attach(testContainerId, testDockerHost, function (err) {
        expect(err).to.exist();
        done();
      });
    });

    it('should fail if missing containerId', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper.attach(null, testDockerHost, function (err) {
        expect(err.output.statusCode).to.equal(400);
        done();
      });
    });

    it('should _handleCmdResult if runCmd failed', function (done) {
      WeaveWrapper._runCmd.yieldsAsync(new Error('Gollum'));
      WeaveWrapper._handleCmdResult.returnsArg(0);
      WeaveWrapper.attach(testContainerId, testDockerHost, function (err) {
        expect(err).to.exist();
        done();
      });
    });

  }); // attach

  describe('_handleCmdResult', function () {
    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, '_isIgnorable');
      done();
    });

    afterEach(function (done) {
      WeaveWrapper._isIgnorable.restore();
      done();
    });

    it('should cb if no error', function (done) {
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err).to.not.exist();
        done();
      }, 'test', {})(null);
    });

    it('should cb with no error for already running', function (done) {
      var testErr = { message: 'weave already running.' };
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err).to.not.exist();
        done();
      }, 'test', {})(testErr);
    });

    it('should cb 500 for unknown err', function (done) {
      WeaveWrapper._isIgnorable.returns(false);
      var testErr = { message: 'mine of moria' };
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err.output.statusCode).to.equal(500);
        done();
      }, 'it never ends', {})(testErr);
    });

    it('should cb 409 for ignorable err', function (done) {
      WeaveWrapper._isIgnorable.returns(true);
      var testErr = { message: 'mine of moria' };
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err.output.statusCode).to.equal(409);
        done();
      }, 'it never ends', {})(testErr);
    });

    it('should append error if error has message', function (done) {
      WeaveWrapper._isIgnorable.returns(true);
      var testErr = new Error('keep it safe');
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err.message).to.equal('keep it secret:keep it safe');
        done();
      }, 'keep it secret', {})(testErr);
    });

     it('should use passed message err does not have message', function (done) {
      WeaveWrapper._isIgnorable.returns(true);
      var testErr = 'false';
      WeaveWrapper._handleCmdResult(function (err) {
        expect(err.message).to.equal('keep it secret');
        done();
      }, 'keep it secret', {})(testErr);
    });
  }); // end _handleCmdResult

  describe('_isIgnorable', function () {
    it('should return true', function (done) {
      [
        'container is not running.',
        'container had died',
        'Error: No such container 189237590128375'
      ].forEach(function (m) {
        var testErr = { message: m };
        expect(WeaveWrapper._isIgnorable(testErr), m)
          .to.be.true();
      });
      done();
    });

    it('should return false', function (done) {
      [
        'is running.',
        'alive',
        'such container 189237590128375'
      ].forEach(function (m) {
        var testErr = { message: m };
        expect(WeaveWrapper._isIgnorable(testErr), m)
          .to.be.false();
      });
      done();
    });
  }); // end _isIgnorable
});
