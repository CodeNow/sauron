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
var ip = require('ip');

var WeaveSetup = require('../../../lib/models/weave-setup.js');
var WeaveWrapper = require('../../../lib/models/weave-wrapper.js');
var Peers = require('../../../lib/models/peers.js');

describe('weave-setup.js unit test', function () {
  describe('setup', function() {
    beforeEach(function(done) {
      sinon.stub(Peers, 'getList');
      sinon.stub(Peers, 'addSelf');
      sinon.stub(WeaveWrapper, 'launch');
      done();
    });

    afterEach(function(done) {
      Peers.getList.restore();
      Peers.addSelf.restore();
      WeaveWrapper.launch.restore();
      done();
    });

    it('should launch add self', function(done) {
      Peers.getList.yieldsAsync(null, []);
      Peers.addSelf.yieldsAsync();
      WeaveWrapper.launch.yieldsAsync();
      WeaveSetup.setup(function (err) {
        expect(err).to.not.exist();
        expect(WeaveWrapper.launch.called);
        expect(Peers.addSelf.called).to.be.true();
        done();
      });
    });

    it('should err if getting peers failed', function(done) {
      var testErr = new Error('Morgoth');
      Peers.getList.yieldsAsync(testErr);
      WeaveSetup.setup(function (err) {
        expect(err).to.exist();
        done();
      });
    });

    it('should not add self if launch failed', function(done) {
      var testErr = new Error('Khamûl');
      Peers.getList.yieldsAsync(null, []);
      WeaveWrapper.launch.yieldsAsync(testErr);
      WeaveSetup.setup(function (err) {
        expect(err).to.exist();
        expect(Peers.addSelf.called).to.be.false();
        done();
      });
    });

    it('should not pass self to launch', function(done) {
      Peers.getList.yieldsAsync(null, [ip.address(), 'a', 'b']);
      WeaveWrapper.launch.yieldsAsync(null);
      Peers.addSelf.yieldsAsync();

      WeaveSetup.setup(function (err) {
        expect(err).to.not.exist();
        var launchArgs = WeaveWrapper.launch.args[0][0];
        expect(launchArgs).to.not.contain(ip.address());
        done();
      });
    });

    it('should not pass self to launch', function(done) {
      Peers.getList.yieldsAsync(null, [ip.address()]);
      WeaveWrapper.launch.yieldsAsync(null);
      Peers.addSelf.yieldsAsync();

      WeaveSetup.setup(function (err) {
        expect(err).to.not.exist();
        var launchArgs = WeaveWrapper.launch.args[0][0];
        expect(launchArgs).to.not.contain(ip.address());
        done();
      });
    });
  }); // end setup
}); // weave-setup.js unit test