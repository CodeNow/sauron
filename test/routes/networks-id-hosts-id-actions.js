'use strict';
require('../../lib/loadenv.js')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var redis = require('../../lib/models/redis.js');
var supertest = require('supertest');
var app = require('../../lib/app.js');
var createCount = require('callback-count');



lab.experiment('/networks/:networkIp/hosts/:hostIp/actions/*', function () {
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

  lab.experiment('POST /actions/attach', function () {
    lab.test('attach host to container', function (done) {
      supertest(app).post('/networks').expect(200).end(
        function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
          supertest(app).post('/networks/10.255.252.0/hosts').expect(200).end(
            function (err, res) {
              if (err) { return done(err); }
              Lab.expect(res.body.hostIp).to.equal('10.255.252.1');
              var old = require('child_process').exec;
              require('child_process').exec = function (cmd, cb) {
                if (~cmd.indexOf('launch')) { return cb(null, 'container_id'); }
                cb();
              };
              supertest(app)
                .put('/networks/10.255.252.0/hosts/10.255.252.1/actions/attach')
                .send({ containerId: 'container_id' })
                .expect(200, function(err) {
                  require('child_process').exec = old;
                  if (err) {return done(err); }
                  done();
                });
          });
        });
    });

  lab.experiment('POST /actions/attach', function () {
    lab.test('detach host to container', function (done) {
      supertest(app).post('/networks').expect(200).end(
        function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
          supertest(app).post('/networks/10.255.252.0/hosts').expect(200).end(
            function (err, res) {
              if (err) { return done(err); }
              Lab.expect(res.body.hostIp).to.equal('10.255.252.1');
              var old = require('child_process').exec;
              require('child_process').exec = function (cmd, cb) {
                if (~cmd.indexOf('launch')) { return cb(null, 'container_id'); }
                cb();
              };
              supertest(app)
                .put('/networks/10.255.252.0/hosts/10.255.252.1/actions/attach')
                .send({ containerId: 'container_id' })
                .expect(200, function(err) {
                  if (err) {return done(err); }
                  supertest(app)
                    .put('/networks/10.255.252.0/hosts/10.255.252.1/actions/detach')
                    .send({ containerId: 'container_id' })
                    .expect(200, function(err) {
                      require('child_process').exec = old;
                      if (err) {return done(err); }
                      done();
                    });
                });
          });
        });
      });
    });
  });
}); // networks