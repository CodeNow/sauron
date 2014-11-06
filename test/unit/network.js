'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var network = require('../../lib/models/network.js');
var redis = require('../../lib/models/redis.js');
var ip = require('ip');

var createCount = require('callback-count');

lab.experiment('/lib/models/network.js unit test', function () {
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
  lab.experiment('createNetworkAddress', function () {
    lab.test('empty redis', function (done) {
      network.createNetworkAddress('test', function (err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.255.252.0');
        done();
      });
    });
    lab.test('2 in a row', function (done) {
      network.createNetworkAddress('test', function (err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.255.252.0');
        network.createNetworkAddress('test', function (err, addr) {
          if (err) { return done(err); }
          Lab.expect(addr).to.equal('10.255.248.0');
          done();
        });
      });
    });
    lab.test('fill network cidr 9', function (done) {
      var old = process.env.WEAVE_NETWORK_CIDR;
      process.env.WEAVE_NETWORK_CIDR = 9;
      network.createNetworkAddress('test', function (err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.128.0.0');
        network.createNetworkAddress('test', function (err) {
          if (!err) { return done(new Error('should not be created')); }
          Lab.expect(err.message).to.equal('could not create new network');
          process.env.WEAVE_NETWORK_CIDR = old;
          done();
        });
      });
    });
    lab.test('2 in a row with gap', function (done) {
      redis.hset(process.env.WEAVE_NETWORKS, '10.255.248.0', 'test', function (err) {
        if (err) { return done(err); }
        network.createNetworkAddress('test', function (err, addr) {
          if (err) { return done(err); }
          Lab.expect(addr).to.equal('10.255.252.0');
          network.createNetworkAddress('test', function (err, addr) {
            if (err) { return done(err); }
            Lab.expect(addr).to.equal('10.255.244.0');
            done();
          });
        });
      });
    });
  }); // createNetworkAddress
  lab.experiment('removeNetworkAddress', function () {
    lab.test('remove 1 addr', function (done) {
      network.createNetworkAddress('test', function (err, addr) {
        if (err) { return done(err); }

        Lab.expect(addr).to.equal('10.255.252.0');
        network.removeNetworkAddress(addr, function (err) {
          if (err) { return done(err); }
          redis.hexists(process.env.WEAVE_NETWORKS, addr, function (err, status) {
            if (err) { return done(err); }
            Lab.expect(status).to.equal('0');
            done();
          });
        });
      });
    });
    lab.test('remove non allocated addr sould not kill others', function (done) {
      network.createNetworkAddress('test', function (err, addr) {
        if (err) { return done(err); }

        Lab.expect(addr).to.equal('10.255.252.0');
        network.removeNetworkAddress('10.1.1.0', function (err) {
          Lab.expect(err.message).to.equal('network address not found');
          redis.hexists(process.env.WEAVE_NETWORKS, addr, function (err, status) {
            if (err) { return done(err); }
            Lab.expect(status).to.equal('1');
            done();
          });
        });
      });
    });
  }); // removeNetworkAddress

  lab.experiment('createHostAddress', function () {
    var networkIp = '';
    lab.beforeEach(function (done) {
      network.createNetworkAddress('test', function (err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.255.252.0');
        networkIp = addr;
        done();
      });
    });
    lab.test('invalid param', function (done) {
      network.createHostAddress({an:'and'}, function (err) {
        if (err && err.message === 'network not allocated') {
          return done();
        }
        done(new Error('host should not have been created'));
      });
    });
    lab.test('no network', function (done) {
      network.createHostAddress('10.0.0.0', function (err) {
        if (err && err.message === 'network not allocated') {
          return done();
        }
        done(new Error('host should not have been created'));
      });
    });
    lab.test('create 1 host from network', function (done) {
      network.createHostAddress(networkIp, function (err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.255.252.1');
        done();
      });
    });
    lab.test('create 2 host from 1 network', function (done) {
      network.createHostAddress(networkIp, function (err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.255.252.1');
        network.createHostAddress(networkIp, function (err, naddr) {
          if (err) { return done(err); }
          Lab.expect(naddr).to.equal('10.255.252.2');
          done();
        });
      });
    });
    lab.test('fill network with cidr 30', function (done) {
      var old = process.env.WEAVE_NETWORK_CIDR;
      process.env.WEAVE_NETWORK_CIDR = 30;
      network.createHostAddress(networkIp, function (err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.255.252.1');
        network.createHostAddress(networkIp, function (err, naddr) {
          if (err) { return done(err); }
          Lab.expect(naddr).to.equal('10.255.252.2');
          network.createHostAddress(networkIp, function (err) {
            if (!err) { return done(new Error('should not be created')); }
            Lab.expect(err.message).to.equal('could not get new router IP');
            process.env.WEAVE_NETWORK_CIDR = old;
            done();
          });
        });
      });
    });
    lab.test('create 2 host from 2 network', function (done) {
      network.createHostAddress(networkIp, function (err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.255.252.1');
        network.createNetworkAddress('test', function (err, addr) {
          if (err) { return done(err); }
          Lab.expect(addr).to.equal('10.255.248.0');
          network.createHostAddress(addr, function (err, naddr) {
            if (err) { return done(err); }
            Lab.expect(naddr).to.equal('10.255.248.1');
            done();
          });
        });
      });
    });
  }); // createHostAddress
  lab.experiment('removeHostAddress', function () {
    var networkIp = '';
    lab.beforeEach(function (done) {
      network.createNetworkAddress('test', function (err, addr) {
        if (err) { return done(err); }
        Lab.expect(addr).to.equal('10.255.252.0');
        networkIp = addr;
        done();
      });
    });

    lab.test('remove 1 addr', function (done) {
      network.createHostAddress(networkIp, function (err, addr) {
        if (err) { return done(err); }

        Lab.expect(addr).to.equal('10.255.252.1');
        network.removeHostAddress(networkIp, addr, function (err) {
          if (err) { return done(err); }
          redis.hexists(process.env.WEAVE_NETWORKS, addr, function (err, status) {
            if (err) { return done(err); }
            Lab.expect(status).to.equal('0');
            done();
          });
        });
      });
    });
    lab.test('remove non allocated addr sould not kill others', function (done) {
      network.createHostAddress(networkIp, function (err, addr) {
        if (err) { return done(err); }

        Lab.expect(addr).to.equal('10.255.252.1');
        network.removeHostAddress(networkIp, '10.1.1.0', function (err) {
          Lab.expect(err.message).to.equal('host address not found');
          redis.hexists(process.env.WEAVE_NETWORKS+':10.255.252.0', '10.255.252.1',
            function (err, status) {
              if (err) { return done(err); }
              Lab.expect(status).to.equal('1');
              done();
            });
        });
      });
    });
  }); // removeHostAddress

  lab.experiment('getPeers', function () {
    lab.test('list peers', function (done) {
      network.initRouters(function (err) {
        if (err) { return done(err); }
        network.createHostAddress(process.env.WEAVE_ROUTER_NETWORK, function (err) {
          if (err) { return done(err); }
          network.createHostAddress(process.env.WEAVE_ROUTER_NETWORK, function (err) {
            if (err) { return done(err); }
            network.createHostAddress(process.env.WEAVE_ROUTER_NETWORK, function (err) {
              if (err) { return done(err); }
              network.getPeers(function (err, addrs) {
                Lab.expect(addrs.length).to.equal(3);
                Lab.expect(addrs).to.not.contain(process.env.WEAVE_ROUTER_NETWORK);
                Lab.expect(addrs).to.contain(ip.address());
                done();
              });
            });
          });
        });
      });
    });
    lab.test('list empty routers', function (done) {
      network.getPeers(function (err, addrs) {
        Lab.expect(addrs.length).to.equal(0);
        done();
      });
    });
  }); // getPeers

  lab.experiment('getRouterMapping', function () {
    lab.test('get correct mapping', function (done) {
      network.initRouters(function (err) {
        if (err) { return done(err); }
        network.createHostAddress(process.env.WEAVE_ROUTER_NETWORK, function (err, addr) {
          if (err) { return done(err); }
          network.getRouterMapping(ip.address(), function (err, host) {
            Lab.expect(host).to.equal(addr);
            done();
          });
        });
      });
    });
  }); // getRouterMapping

  lab.experiment('initRouters', function () {
    lab.test('list initial router', function (done) {
      network.initRouters(function (err) {
        if (err) { return done(err); }
        network.getPeers(function (err, addrs) {
          Lab.expect(addrs.length).to.equal(0);
          done();
        });
      });
    });
  }); // initRouters
}); //lib/models/network.js unit test