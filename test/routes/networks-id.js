'use strict';
require('../../lib/loadenv.js')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var redis = require('../../lib/models/redis.js');
var supertest = require('supertest');
var app = require('../../lib/app.js');
var createCount = require('callback-count');



lab.experiment('/networks/:networkIp', function () {
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

  lab.experiment('DELETE', function () {
    lab.test('allocate and delete network', function (done) {
      supertest(app)
        .post('/networks')
        .expect(200)
        .end(function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
          supertest(app)
            .delete('/networks/10.255.252.0')
            .expect(200, done);
        });
    });
    lab.test('delete non allocated network', function (done) {
      supertest(app)
        .delete('/networks/10.1.3.0')
        .expect(404, done);
    });
    lab.test('invalid network ip, asdf', function (done) {
      supertest(app)
        .delete('/networks/asdf')
        .expect(400, done);
    });
    lab.test('invalid network ip, 20.20.20.20.20', function (done) {
      supertest(app)
        .delete('/networks/20.20.20.20.20')
        .expect(400, done);
    });
  });
}); // networks