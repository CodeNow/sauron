'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var network = require('../../lib/models/network.js');
var redis = require('../../lib/models/redis.js');

var createCount = require('callback-count');

lab.experiment('/lib/models/network.js unit test', function () {
  lab.beforeEach(function(done) {
    redis.keys(process.env.WEAVE_NETWORKS+'*', function(err, list) {
      if (err) { return done(err); }
      var count = createCount(done);
      list.forEach(function(item) {
        redis.del(item, count.inc().next);
      });
      count.inc().next();
    });
  });
  lab.beforeEach(function(done) {
    redis.keys(process.env.WEAVE_ROUTERS+'*', function(err, list) {
      if (err) { return done(err); }
      var count = createCount(done);
      list.forEach(function(item) {
        redis.del(item, count.inc().next);
      });
      count.inc().next();
    });
  });
  lab.experiment('createNetworkAddress', function () {
    lab.test('empty redis', function (done) {
      network.createNetworkAddress('test', function(err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.255.252.0');
        done();
      });
    });
    lab.test('2 in a row', function (done) {
      network.createNetworkAddress('test', function(err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.255.252.0');
        network.createNetworkAddress('test', function(err, addr) {
          if (err) { return done(err); }
          Lab.expect(addr).to.equal('10.255.248.0');
          done();
        });
      });
    });
    lab.test('2 in a row with gap', function (done) {
      redis.hset(process.env.WEAVE_NETWORKS, '10.255.248.0', 'test', function(err) {
        if (err) { return done(err); }
        network.createNetworkAddress('test', function(err, addr) {
          if (err) { return done(err); }
          Lab.expect(addr).to.equal('10.255.252.0');
          network.createNetworkAddress('test', function(err, addr) {
            if (err) { return done(err); }
            Lab.expect(addr).to.equal('10.255.244.0');
            done();
          });
        });
      });
    });
  }); // createHostAddress
  lab.experiment('removeNetworkAddress', function () {
    lab.test('remove 1 addr', function (done) {
      network.createNetworkAddress('test', function(err, addr) {
        if (err) { return done(err); }

        Lab.expect(addr).to.equal('10.255.252.0');
        network.removeNetworkAddress(addr, function(err) {
          if (err) { return done(err); }
          redis.hexists(process.env.WEAVE_NETWORKS, addr, function(err, status) {
            if (err) { return done(err); }
            Lab.expect(status).to.equal('1');
            done();
          });
        });
      });
    });
    lab.test('remove non allocated addr', function (done) {
      network.removeNetworkAddress('10.255.244.0', done);
    });
  }); // removeNetworkAddress
}); //lib/models/network.js unit test