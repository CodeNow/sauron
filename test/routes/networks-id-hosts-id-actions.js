'use strict';
require('../../lib/loadenv.js')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var redis = require('../../lib/models/redis.js');
var supertest = require('supertest');
var app = require('../../lib/app.js');
var createCount = require('callback-count');
var mock = require('../../lib/executors/mock');

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
              supertest(app)
                .put('/networks/10.255.252.0/hosts/10.255.252.1/actions/attach')
                .send({ containerId: 'container_id' })
                .expect(200, function(err) {
                  if (err) {return done(err); }
                  done();
                });
          });
        });
      });
    lab.test('invalid host ip', function (done) {
      supertest(app)
        .put('/networks/10.255.10.0/hosts/10.255.b.1/actions/attach')
        .send({ containerId: 'container_id' })
        .expect(400, done);
    });
    lab.test('invalid container ID', function (done) {
      supertest(app)
        .put('/networks/10.255.a.0/hosts/10.255.252.1/actions/attach')
        .expect(400, done);
    });
    lab.test('weave attach error', function (done) {
      mock.set(function(data, cb) { return cb('some weave err'); });
      supertest(app)
        .put('/networks/10.255.10.0/hosts/10.255.252.1/actions/attach')
        .send({ containerId: 'container_id' })
        .expect(500, function(err, res) {
          mock.reset();
          console.log('anand', res.body, res);
          if (err) { return done(err); }
          Lab.expect(res.body.error).to.equal('some weave err');
          done();
        });
    });
  }); //POST /actions/attach

  lab.experiment('POST /actions/detach', function () {
    lab.test('detach host to container', function (done) {
      supertest(app).post('/networks').expect(200).end(function (err, res) {
        if (err) { return done(err); }
        Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
        supertest(app).post('/networks/10.255.252.0/hosts').expect(200).end(function (err, res) {
            if (err) { return done(err); }
            Lab.expect(res.body.hostIp).to.equal('10.255.252.1');
            supertest(app)
              .put('/networks/10.255.252.0/hosts/10.255.252.1/actions/attach')
              .send({ containerId: 'container_id' })
              .expect(200, function(err) {
                if (err) {return done(err); }
                supertest(app)
                  .put('/networks/10.255.252.0/hosts/10.255.252.1/actions/detach')
                  .send({ containerId: 'container_id' })
                  .expect(200, function(err) {
                    if (err) {return done(err); }
                    done();
                  });
              });
        });
      });
    });
    lab.test('invalid host ip', function (done) {
      supertest(app)
        .put('/networks/10.255.10.0/hosts/10.255.b.1/actions/detach')
        .send({ containerId: 'container_id' })
        .expect(400, done);
    });
    lab.test('invalid container ID', function (done) {
      supertest(app)
        .put('/networks/10.255.a.0/hosts/10.255.252.1/actions/detach')
        .expect(400, done);
    });
    lab.test('weave attach error', function (done) {
      mock.set(function(data, cb) { return cb('some weave err'); });
      supertest(app)
        .put('/networks/10.255.10.0/hosts/10.255.252.1/actions/detach')
        .send({ containerId: 'container_id' })
        .expect(500, function(err, res) {
          mock.reset();
          if (err) { return done(err); }
          Lab.expect(res.body.error).to.equal('some weave err');
          done();
        });
    });
  }); //POST /actions/detach
}); // networks