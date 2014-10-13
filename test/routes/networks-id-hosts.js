'use strict';
require('../../lib/loadenv.js')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var redis = require('../../lib/models/redis.js');
var supertest = require('supertest');
var app = require('../../lib/app.js');
var createCount = require('callback-count');



lab.experiment('/networks/:networkIp/hosts', function () {
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
    lab.test('allocate host on allocated network', function (done) {
      supertest(app).post('/networks').expect(200).end(
        function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
          supertest(app).post('/networks/10.255.252.0/hosts').expect(200).end(
            function (err, res) {
              if (err) { return done(err); }
              Lab.expect(res.body.hostIp).to.equal('10.255.252.1');
              done();
          });
        });
    });
    lab.test('invalid network Id a.b.c.e', function (done) {
      supertest(app).post('/networks').expect(200).end(
        function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
          supertest(app).post('/networks/a.b.c.e/hosts').expect(400, done);
        });
    });
    lab.test('invalid network Id 10.b.c.e', function (done) {
      supertest(app).post('/networks').expect(200).end(
        function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
          supertest(app).post('/networks/10.b.c.e/hosts').expect(400, done);
        });
    });
    lab.test('allocate 2 host on allocated network', function (done) {
      supertest(app).post('/networks').expect(200).end(
        function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
          supertest(app).post('/networks/10.255.252.0/hosts').expect(200).end(
            function (err, res) {
              if (err) { return done(err); }
              Lab.expect(res.body.hostIp).to.equal('10.255.252.1');
              supertest(app).post('/networks/10.255.252.0/hosts').expect(200).end(
                function (err, res) {
                  if (err) { return done(err); }
                  Lab.expect(res.body.hostIp).to.equal('10.255.252.2');
                  done();
                });
          });
        });
    });
    lab.test('allocate host on unallocated network', function (done) {
      supertest(app).post('/networks/10.255.252.0/hosts')
        .expect(400).end(
          function (err, res) {
            if (err) { return done(err); }
            Lab.expect(res.body.message).to.equal('network not allocated');
            done();
        });
    });
    lab.test('allocate 2 host on separate networks', function (done) {
      supertest(app).post('/networks').expect(200).end(
        function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
          supertest(app).post('/networks').expect(200).end(
            function (err, res) {
              if (err) { return done(err); }
              Lab.expect(res.body.networkIp).to.equal('10.255.248.0');
              supertest(app).post('/networks/10.255.252.0/hosts').expect(200).end(
                function (err, res) {
                  if (err) { return done(err); }
                  Lab.expect(res.body.hostIp).to.equal('10.255.252.1');
                  supertest(app).post('/networks/10.255.248.0/hosts').expect(200).end(
                    function (err, res) {
                      if (err) { return done(err); }
                      Lab.expect(res.body.hostIp).to.equal('10.255.248.1');
                      done();
                    });
                });
            });
        });
    });
  });
}); // networks