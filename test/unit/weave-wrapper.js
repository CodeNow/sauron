'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var weaveWrapper = require('../../lib/engines/weave-wrapper.js');

lab.experiment('/lib/engines/weave-wrapper.js unit test', function () {
  lab.experiment('sudo weave depended command', function () {
    lab.experiment('status', function () {
      lab.test('get status', function (done) {
        weaveWrapper.status(function (err, data) {
          Lab.expect(data).to.equal('sudo weave status');
          done();
        });
      });
    }); // status
    lab.experiment('launch', function () {
      lab.test('correct launch', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32',
          password: 'pass',
          peers: ['10.0.0.1', '10.0.0.2']
        };
        weaveWrapper.launch(options, function (err, data) {
          Lab.expect(data).to.equal(
            'sudo weave launch 10.0.0.0/32 -password pass 10.0.0.1 10.0.0.2');
          done();
        });
      });
      lab.test('no peer launch', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32',
          password: 'pass',
          peers: []
        };
        weaveWrapper.launch(options, function (err, data) {
          Lab.expect(data).to.equal(
            'sudo weave launch 10.0.0.0/32 -password pass');
          done();
        });
      });
      lab.test('missing ipaddr', function (done) {
        var options = {
          subnet: '32',
          password: 'pass',
          peers: []
        };
        weaveWrapper.launch(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing subnet', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          password: 'pass',
          peers: []
        };
        weaveWrapper.launch(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
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
      lab.test('normal', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32',
          containerId: 'container_id'
        };
        weaveWrapper.attach(options, function (err, data) {
          Lab.expect(data).to.equal(
            'sudo weave attach 10.0.0.0/32 container_id');
          done();
        });
      });
      lab.test('missing ipaddr', function (done) {
        var options = {
          subnet: '32',
          containerId: 'container_id'
        };
        weaveWrapper.attach(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing subnet', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          containerId: 'container_id'
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
    }); // attach

    lab.experiment('detach', function () {
      lab.test('normal', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          subnet: '32',
          containerId: 'container_id'
        };
        weaveWrapper.detach(options, function (err, data) {
          Lab.expect(data).to.equal(
            'sudo weave detach 10.0.0.0/32 container_id');
          done();
        });
      });
      lab.test('missing ipaddr', function (done) {
        var options = {
          subnet: '32',
          containerId: 'container_id'
        };
        weaveWrapper.detach(options, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing subnet', function (done) {
        var options = {
          ipaddr: '10.0.0.0',
          containerId: 'container_id'
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
    }); // detach

  }); // weave depended command
});