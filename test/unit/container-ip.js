'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var containerIp = require('../../lib/models/network/container-ip.js');
var redis = require('../../lib/models/redis.js');

lab.experiment('/lib/models/network/container-ip.js unit test', function () {
  lab.beforeEach(function(done) {
    redis.flushdb(done);
  });

  lab.experiment('setContainerIp', function () {
    lab.test('set container Ip', function (done) {
      containerIp.setContainerIp('container_id', '10.222.231.9', function (err) {
        if (err) { return done(err); }
        containerIp.getContainerIp('container_id', function(err, data) {
          if (err) { return done(err); }
          Lab.expect(data).to.equal('10.222.231.9');
          done();
        });
      });
    });
    lab.test('should error set twice', function (done) {
      containerIp.setContainerIp('container_id', '10.222.231.9', function (err) {
        if (err) { return done(err); }
        containerIp.setContainerIp('container_id', '10.222.231.9', function (err) {
          Lab.expect(err.message).to.equal('container already mapped to ip');
          Lab.expect(err.data.oldIp).to.equal('10.222.231.9');
          Lab.expect(err.data.newContainerId).to.equal('container_id');
          Lab.expect(err.data.oldContainerId).to.equal('container_id');
          Lab.expect(err.data.newIp).to.equal('10.222.231.9');
          done();
        });
      });
    });
    lab.test('should error if container was set to diff ip', function (done) {
      containerIp.setContainerIp('container_id', '10.222.231.9', function (err) {
        if (err) { return done(err); }
        containerIp.setContainerIp('container_id', '10.222.231.10', function (err) {
          Lab.expect(err.message).to.equal('container already mapped to ip');
          Lab.expect(err.data.oldIp).to.equal('10.222.231.9');
          Lab.expect(err.data.newContainerId).to.equal('container_id');
          Lab.expect(err.data.oldContainerId).to.equal('container_id');
          Lab.expect(err.data.newIp).to.equal('10.222.231.10');
          done();
        });
      });
    });
    lab.test('should error if ip was set to diff container', function (done) {
      containerIp.setContainerIp('container_1', '10.222.231.9', function (err) {
        if (err) { return done(err); }
        containerIp.setContainerIp('container_2', '10.222.231.9', function (err) {
          Lab.expect(err.message).to.equal('ip already mapped to a container');
          Lab.expect(err.data.newContainerId).to.equal('container_2');
          Lab.expect(err.data.newIp).to.equal('10.222.231.9');
          done();
        });
      });
    });
    lab.test('should set 2 in a row', function (done) {
      containerIp.setContainerIp('container_1', '10.222.231.9', function (err) {
        if (err) { return done(err); }
        containerIp.setContainerIp('container_2', '10.222.231.10', function (err) {
          if (err) { return done(err); }
          containerIp.getContainerIp('container_1', function(err, data) {
            if (err) { return done(err); }
            Lab.expect(data).to.equal('10.222.231.9');
            containerIp.getContainerIp('container_2', function(err, data) {
                if (err) { return done(err); }
                Lab.expect(data).to.equal('10.222.231.10');
                done();
              });
          });
        });
      });
    });
  }); // setContainerIp

  lab.experiment('removeContainerIp', function () {
    lab.test('should unmap ip form container', function (done) {
      containerIp.setContainerIp('container_id', '10.222.231.9', function (err) {
        if (err) { return done(err); }
        containerIp.removeContainerIp('container_id', '10.222.231.9', function(err){
          if (err) { return done(err); }
          containerIp.getContainerIp('container_id', function(err) {
            Lab.expect(err.message).to.equal('container does not have ip');
            done();
          });
        });
      });
    });
    lab.test('should error if ip already mapped to differnet container', function (done) {
      containerIp.setContainerIp('container_0', '10.222.231.9', function (err) {
        if (err) { return done(err); }
        containerIp.removeContainerIp('container_1', '10.222.231.9', function(err){
          Lab.expect(err.message).to.equal('ip is mapped to a different container');
          Lab.expect(err.data.ip).to.equal('10.222.231.9');
          Lab.expect(err.data.oldContainer).to.equal('container_0');
          Lab.expect(err.data.newContainer).to.equal('container_1');
          done();
        });
      });
    });
    lab.test('should error if ipaddr does not map not mapped', function (done) {
      containerIp.setContainerIp('container_id', '10.222.231.9', function (err) {
        if (err) { return done(err); }
        containerIp.removeContainerIp('container_id', '10.222.231.10', function(err){
          Lab.expect(err.message).to.equal('container ip does not exist');
          done();
        });
      });
    });
    lab.test('should error deleteing non existing ip', function (done) {
      containerIp.removeContainerIp('container_id', '10.222.231.10', function(err){
        Lab.expect(err.message).to.equal('container ip does not exist');
        done();
      });
    });
  }); // removeContainerIp

  lab.experiment('getContainerIp', function () {
    lab.test('set get setip', function (done) {
      containerIp.setContainerIp('container_id', '10.222.231.9', function (err) {
        if (err) { return done(err); }
        containerIp.getContainerIp('container_id', function(err, data) {
          if (err) { return done(err); }
          Lab.expect(data).to.equal('10.222.231.9');
          done();
        });
      });
    });
    lab.test('should error if container not mapped', function (done) {
      containerIp.getContainerIp('container_id', function(err) {
        Lab.expect(err.message).to.equal('container does not have ip');
        done();
      });
    });
  }); // getContainerIp
}); // lib/models/network/container-ip.js unit test