'use strict';
require('../../lib/loadenv.js')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var redis = require('../../lib/models/redis.js');
var supertest = require('supertest');
var app = require('../../lib/app.js');
var mock = require('../../lib/executors/mock');
var docker = require('../fixtures/docker.js');
var dockerClient = docker.client;

lab.experiment('/networks/:networkIp/hosts/:hostIp/actions/*', function () {
  lab.beforeEach(function (done) {
    redis.flushdb(done);
  });
  lab.beforeEach(mock.reset);
  lab.beforeEach(docker.start);
  var containerId;
  lab.beforeEach(function(done) {
    dockerClient.createContainer({Image: 'ubuntu', Cmd: ['/bin/bash'], name: 'ubuntu-test'},
      function (err, container) {
        if (err) { return done(err); }
        containerId = container.id;
        container.start(done);
      });
  });
  lab.afterEach(docker.stop);
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
                .send({ containerId: containerId })
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
        .send({ containerId: containerId })
        .expect(400, done);
    });
    lab.test('invalid container ID', function (done) {
      supertest(app)
        .put('/networks/10.255.a.0/hosts/10.255.252.1/actions/attach')
        .expect(400, done);
    });
    lab.test('should error if connecting to non existing container', function (done) {
      supertest(app)
        .put('/networks/10.255.10.0/hosts/10.255.252.1/actions/attach')
        .send({ containerId: 'fakeId' })
        .expect(500, done);
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
              .send({ containerId: containerId })
              .expect(200, function(err) {
                if (err) {return done(err); }
                supertest(app)
                  .put('/networks/10.255.252.0/hosts/10.255.252.1/actions/detach')
                  .send({ containerId: containerId })
                  .expect(200, function(err) {
                    if (err) {return done(err); }
                    done();
                  });
              });
        });
      });
    });
  lab.test('should error if ip was set to diff container', function (done) {
      supertest(app).post('/networks').expect(200).end(function (err, res) {
        if (err) { return done(err); }
        Lab.expect(res.body.networkIp).to.equal('10.255.252.0');
        supertest(app).post('/networks/10.255.252.0/hosts').expect(200).end(function (err, res) {
            if (err) { return done(err); }
            Lab.expect(res.body.hostIp).to.equal('10.255.252.1');
            supertest(app)
              .put('/networks/10.255.252.0/hosts/10.255.252.1/actions/attach')
              .send({ containerId: containerId })
              .expect(200, function(err) {
                if (err) {return done(err); }
                supertest(app)
                  .put('/networks/10.255.252.0/hosts/10.255.252.1/actions/detach')
                  .send({ containerId: 'different' })
                  .expect(409, function(err, res) {
                    console.log(err, res);
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
        .send({ containerId: containerId })
        .expect(400, done);
    });
    lab.test('invalid container ID', function (done) {
      supertest(app)
        .put('/networks/10.255.a.0/hosts/10.255.252.1/actions/detach')
        .expect(400, done);
    });
    lab.test('should error if detach non attached ip', function (done) {
      supertest(app)
        .put('/networks/10.255.10.0/hosts/10.255.252.1/actions/detach')
        .send({ containerId: containerId })
        .expect(409, function(err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.message).to.equal('container is not mapped to an ip');
          done();
        });
    });
  }); //POST /actions/detach
}); // networks