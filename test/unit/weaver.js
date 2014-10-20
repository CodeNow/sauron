'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var mock = require('../../lib/executors/mock');
var weaver = require('../../lib/models/weaver.js');
var redis = require('../../lib/models/redis.js');
var createCount = require('callback-count');
var network = require('../../lib/models/network.js');

lab.experiment('/lib/models/weaver.js unit test', function () {
  lab.beforeEach(function (done) {
    redis.keys(process.env.WEAVE_NETWORKS+'*', function (err, list) {
      if (err) { return done(err); }
      var count = createCount(done);
      list.forEach(function (item) {
        redis.del(item, count.inc().next);
      });
      count.inc().next();
    });
  });
  lab.experiment('normal commands', function () {
    lab.experiment('setup', function () {
      lab.test('already on', function (done) {
        weaver.setup(function (err) {
          Lab.expect(err.message).to.equal('container already started');
          done();
        });
      });
      lab.test('start with network already allocated', function (done) {
        // mock weaver
       mock.set(function (cmd, cb) {
          if (~cmd.indexOf('sudo weave status')) { return cb('up'); }
          cb(null, cmd);
        });
        network.initRouters(function () {
          weaver.setup(function (err) {
            mock.reset();
            if (err) { return done(err);}
            done();
          });
        });
      });
      lab.test('should clear ip if failed to launch', function (done) {
        // mock weaver
        mock.set(function (cmd, cb) {
          if (~cmd.indexOf('sudo weave status')) { return cb('up'); }
          if (~cmd.indexOf('launch')) { return cb('some launch err'); }
          cb(null, cmd);
        });
        network.initRouters(function () {
          weaver.setup(function (err) {
            Lab.expect(err).to.have.equal('some launch err');

            mock.reset();
            redis.hvals(process.env.WEAVE_NETWORKS+':'+process.env.WEAVE_ROUTER_NETWORK,
              function (err, data) {
                if (err) { return done(err); }

                Lab.expect(data).to.have.length(1);
                Lab.expect(data).to.have.contain(process.env.WEAVE_ROUTER_NETWORK);
                done();
            });
          });
        });
      });
      lab.test('restart after already started', function (done) {
        // mock weaver
        mock.set(function (cmd, cb) {
          if (~cmd.indexOf('sudo weave status')) { return cb('up'); }
          cb(null, cmd);
        });
        network.initRouters(function (err) {
          if (err) { return done(err); }
          weaver.setup(function (err) {
            if (err) { return done(err); }
            weaver.setup(function (err) {
              mock.reset();
              if (err) { return done(err);}
                redis.hvals(process.env.WEAVE_NETWORKS+':'+process.env.WEAVE_ROUTER_NETWORK,
                  function (err, data) {
                    if (err) { return done(err); }
                    Lab.expect(data).to.have.length(2);
                    done();
                });
            });
          });
        });
      });
    });
    lab.experiment('attachContainer', function () {
      lab.test('normal', function (done) {
        weaver.attachContainer('container_id', '10.0.0.0', '32', function (err, data) {
          Lab.expect(data).to.equal('sudo weave attach 10.0.0.0/32 container_id');
          done();
        });
      });
      lab.test('missing ipaddr', function (done) {
        weaver.attachContainer('container_id', null, '32', function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing subnet', function (done) {
        weaver.attachContainer('container_id', '32', null, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing containerId', function (done) {
        weaver.attachContainer(null, '10.0.0.0', '32', function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing all', function (done) {
        weaver.attachContainer(null, null, null, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
    }); // attachContainer

    lab.experiment('detachContainer', function () {
      lab.test('normal', function (done) {
        weaver.detachContainer('container_id', '10.0.0.0', '32', function (err, data) {
          Lab.expect(data).to.equal(
            'sudo weave detach 10.0.0.0/32 container_id');
          done();
        });
      });
      lab.test('missing ipaddr', function (done) {
        weaver.detachContainer('container_id', null, '32', function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing subnet', function (done) {
        weaver.detachContainer('container_id', '32', null, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing containerId', function (done) {
        weaver.detachContainer(null, '10.0.0.0', '32', function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
      lab.test('missing all', function (done) {
        weaver.detachContainer(null, null, null, function (err) {
          Lab.expect(err.message).to.equal('invalid input');
          done();
        });
      });
    }); // attachContainer

  }); // weave depended command
});