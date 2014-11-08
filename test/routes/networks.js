'use strict';
require('../../lib/loadenv.js')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var redis = require('../../lib/models/redis.js');
var supertest = require('supertest');
var app = require('../../lib/app.js');
var createCount = require('callback-count');

lab.experiment('/networks', function () {
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

  lab.experiment('POST', function () {
    lab.test('allocate network', function (done) {
      supertest(app)
        .post('/networks')
        .expect(200)
        .end(function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
          done();
        });
    });
    lab.test('allocate 2 networks network', function (done) {
      supertest(app)
        .post('/networks')
        .expect(200)
        .end(function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
          supertest(app)
            .post('/networks')
            .expect(200)
            .end(function (err, res) {
              if (err) { return done(err); }
              Lab.expect(res.body.networkIp).to.equal('10.255.248.0');
              done();
          });
        });
    });
    lab.test('cause alloc error due to invalid NETOWORK CIDR', function (done) {
      var old = process.env.WEAVE_NETWORK_CIDR;
      process.env.WEAVE_NETWORK_CIDR = 0;
      supertest(app)
        .post('/networks')
        .expect(500)
        .end(function (err) {
          process.env.WEAVE_NETWORK_CIDR = old;
          if (err) { return done(err); }
          done();
        });
    });
  });
}); // networks