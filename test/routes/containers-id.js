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

lab.experiment('/containers/:containerId', function () {
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
  lab.experiment('GET', function () {
    lab.test('should return ip address of container', function (done) {
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
                  supertest(app)
                    .get('/containers/'+containerId)
                    .expect(200, function(err, res) {
                      if (err) {return done(err); }
                      Lab.expect(res.body.ip).to.equal('10.255.252.1');
                      done();
                    });
              });
          });
      });
    });
    lab.test('should error if container not allocated', function (done) {
      supertest(app)
        .get('/containers/container_id')
        .expect(404, done);
    });
  }); //GET
}); // networks