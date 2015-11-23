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
var ip = require('ip');

var WeaveSetup = require('../../../lib/models/weave-setup.js');
var WeaveWrapper = require('../../../lib/models/weave-wrapper.js');
var Peers = require('../../../lib/models/peers.js');

describe('weave-setup.js unit test', function () {
  describe('setup', function () {
    beforeEach(function (done) {
      sinon.stub(Peers, 'getList');
      sinon.stub(WeaveWrapper, 'launch');
      done();
    });

    afterEach(function (done) {
      Peers.getList.restore();
      WeaveWrapper.launch.restore();
      done();
    });

    it('should err if getting peers failed', function (done) {
      var testErr = new Error('Morgoth');
      Peers.getList.yieldsAsync(testErr);
      WeaveSetup.setup({}, function (err) {
        expect(err).to.exist();
        expect(Peers.getList.withArgs(process.env.ORG_ID).called)
          .to.be.true();
        done();
      });
    });

    it('should not add self if launch failed', function (done) {
      var testErr = new Error('Khamûl');
      Peers.getList.yieldsAsync(null, []);
      WeaveWrapper.launch.yieldsAsync(testErr);
      WeaveSetup.setup({
        dockerHost: 'test'
      }, function (err) {
        expect(err).to.exist();
        done();
      });
    });

    it('should not pass self to launch', function (done) {
      var testPeers = [ip.address(), 'a', 'b'];
      Peers.getList.yieldsAsync(null, testPeers);
      WeaveWrapper.launch.yieldsAsync(null);

      WeaveSetup.setup({
        dockerHost: 'dockerHost',
      }, function (err) {
        expect(err).to.not.exist();
        expect(Peers.getList.withArgs(process.env.ORG_ID).called)
          .to.be.true();
        expect(WeaveWrapper.launch.withArgs(testPeers, 'dockerHost').called)
          .to.be.true();
        var launchArgs = WeaveWrapper.launch.args[0][0];
        expect(launchArgs).to.not.contain(ip.address());
        done();
      });
    });

    it('should not pass self to launch', function (done) {
      var testPeers = [ip.address()];
      Peers.getList.yieldsAsync(null, testPeers);
      WeaveWrapper.launch.yieldsAsync(null);

      WeaveSetup.setup({
        dockerHost: 'dockerHost'
      }, function (err) {
        expect(err).to.not.exist();
        expect(Peers.getList.withArgs(process.env.ORG_ID).called)
          .to.be.true();
        expect(WeaveWrapper.launch.withArgs(testPeers, 'dockerHost').called)
          .to.be.true();
        var launchArgs = WeaveWrapper.launch.args[0][0];
        expect(launchArgs).to.not.contain(ip.address());
        done();
      });
    });
  }); // end setup
}); // weave-setup.js unit test