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
      child_process.exec.yieldsAsync(undefined, testStdout);
      WeaveWrapper._runCmd(testCmd, function (err, stdout) {
        expect(err).to.not.exist();
        expect(stdout).to.equal(testStdout);
        expect(child_process.exec.withArgs(testCmd).called)
          .to.be.true();
        done();
      });
    });

    it('should cb err with stderr', function (done) {
      var testStderr = 'all deleted';
      child_process.exec.yieldsAsync(new Error('gone'), '', testStderr);
      WeaveWrapper._runCmd(testCmd, function (err) {
        expect(err).to.exist();
        expect(err.stderr).to.equal(testStderr);
        expect(child_process.exec.withArgs(testCmd).called)
          .to.be.true();
        done();
      });
    });
  }); // end _runCmd

  describe('launch', function () {
    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, '_runCmd');
      sinon.stub(WeaveWrapper, 'handleErr');
      process.env.WEAVE_PATH = '/usr/bin/weave';
      process.env.WEAVE_IP_RANGE = '10.0.0.0/8';
      process.env.WEAVE_PASSWORD = 'pass';
      done();
    });

    afterEach(function (done) {
      WeaveWrapper._runCmd.restore();
      WeaveWrapper.handleErr.restore();
      delete process.env.WEAVE_PATH;
      delete process.env.WEAVE_IP_RANGE;
      delete process.env.WEAVE_PASSWORD;
      done();
    });

    it('should launch with peers', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper.handleErr.returnsArg(0);
      var peers = ['10.0.0.1', '10.0.0.2'];

      WeaveWrapper.launch(peers, function (err) {
        expect(err).to.not.exist();
        expect(WeaveWrapper._runCmd
          .withArgs('/usr/bin/weave launch-router --no-dns --password pass ' +
            '--ipalloc-range 10.0.0.0/8 --ipalloc-default-subnet 10.0.0.0/8 ' +
            '10.0.0.1 10.0.0.2').called)
          .to.be.true();
        done();
      });
    });

    it('should launch without peers', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper.handleErr.returnsArg(0);
      var peers = [];

      WeaveWrapper.launch(peers, function (err) {
        expect(err).to.not.exist();
        expect(WeaveWrapper._runCmd
          .withArgs('/usr/bin/weave launch-router --no-dns --password pass ' +
            '--ipalloc-range 10.0.0.0/8 --ipalloc-default-subnet 10.0.0.0/8')
          .called).to.be.true();
        done();
      });
    });

    it('should fail if invalid peers', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper.handleErr.returnsArg(0);
      var peers = 'no valid';
      WeaveWrapper.launch(peers, function (err) {
        expect(err.output.statusCode).to.equal(400);
        done();
      });
    });

    it('should fail if missing peers', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper.handleErr.returnsArg(0);
      WeaveWrapper.launch(null, function (err) {
        expect(err.output.statusCode).to.equal(400);
        done();
      });
    });
  }); // launch

  describe('attach', function () {
    var testContainerId = '1738';

    beforeEach(function (done) {
      sinon.stub(WeaveWrapper, '_runCmd');
      sinon.stub(WeaveWrapper, 'handleErr');
      process.env.WEAVE_PATH = '/usr/bin/weave';
      done();
    });

    afterEach(function (done) {
      WeaveWrapper._runCmd.restore();
      WeaveWrapper.handleErr.restore();
      delete process.env.WEAVE_PATH;
      done();
    });

    it('should attach', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper.handleErr.returnsArg(0);

      WeaveWrapper.attach(testContainerId, function (err) {
        expect(err).to.not.exist();
        expect(WeaveWrapper._runCmd
          .withArgs('/usr/bin/weave attach ' + testContainerId).called)
          .to.be.true();
        done();
      });
    });

    it('should fail if missing containerId', function (done) {
      WeaveWrapper._runCmd.yieldsAsync();
      WeaveWrapper.handleErr.returnsArg(0);
      WeaveWrapper.attach(null, function (err) {
        expect(err.output.statusCode).to.equal(400);
        done();
      });
    });
  }); // attach

  describe('handleErr', function () {
    it('should cb if no error', function (done) {
      WeaveWrapper.handleErr(function (err) {
        expect(err).to.not.exist();
        done();
      })(null);
    });

    it('should cb with no error for already running', function (done) {
      var testErr = { message: 'weave already running.' };
      WeaveWrapper.handleErr(function (err) {
        expect(err).to.not.exist();
        done();
      })(testErr);
    });

    it('should cb 409 for not running', function (done) {
      var testErr = { message: 'container is not running.' };
      WeaveWrapper.handleErr(function (err) {
        expect(err.output.statusCode).to.equal(409);
        done();
      }, 'it never ends', {})(testErr);
    });

    it('should cb 409 for died', function (done) {
      var testErr = { message: 'container had died' };
      WeaveWrapper.handleErr(function (err) {
        expect(err.output.statusCode).to.equal(409);
        done();
      }, 'it never ends', {})(testErr);
    });

    it('should cb 500 for unknown err', function (done) {
      var testErr = { message: 'mine of moria' };
      WeaveWrapper.handleErr(function (err) {
        expect(err.output.statusCode).to.equal(500);
        done();
      }, 'it never ends', {})(testErr);
    });

    it('should append error if error has message', function (done) {
      var testErr = new Error('keep it safe');
      WeaveWrapper.handleErr(function (err) {
        expect(err.message).to.equal('keep it secret:keep it safe');
        done();
      }, 'keep it secret', {})(testErr);
    });

     it('should use passed message err does not have message', function (done) {
      var testErr = 'false';
      WeaveWrapper.handleErr(function (err) {
        expect(err.message).to.equal('keep it secret');
        done();
      }, 'keep it secret', {})(testErr);
    });
  }); // end handleErr
});