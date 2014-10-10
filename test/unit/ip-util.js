'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var ipu = require('../../lib/helpers/ip-utils.js');
var ip = require('ip');

lab.experiment('/lib/helpers/ip-utils.js unit test', function () {
  lab.experiment('isValidIp', function () {
    lab.experiment('valid ips', function () {
      lab.test('10.10.1.1, 10.255.255.255, 10.0.0.0, 10.17.71.26', function (done) {
        ['10.10.1.1', '10.255.255.255', '10.0.0.0', '10.17.71.26']
          .forEach(function(item) {
            Lab.expect(ipu.isValidIp(item)).to.equal(true);
          });
        done();
      });
    });
    lab.experiment('invalid ips', function () {
      lab.test('10.10.1.1, 10.255.255.255, 10.0.0.0, 10.17.71.26', function (done) {
        ['192.10.1.1', 'asdf', {}, [], true, false, '10.10.10', '10', '....', 'a.a.a.a', '10.0.0.a',
        '10.0.0.0.a', '10.0.0.0.0.0.0', '10.0.0.12521525', '22.2222.22.2', '2222.22.22.22',
        '999.10.10.20', '222.222.2.999', '10.10.10.256', '10.10.256.10', '10.256.10.10',
        '256.10.10.10', null, '', NaN]
          .forEach(function(item) {
            Lab.expect(ipu.isValidIp(item)).to.equal(false);
          });
        done();
      });
    });
  });
  lab.experiment('getSmallestAvailableHost', function () {
    lab.experiment('base addr 10.0.0.0', function () {
      lab.test('1 used. lowest', function (done) {
        var hosts = ['10.0.0.1'];
        var host = ipu.getSmallestAvailableHost(hosts,
          process.env.WEAVE_ROUTER_NETWORK, process.env.WEAVE_ROUTER_CIDR);

        Lab.expect(host).to.equal('10.0.0.2');
        done();
      });
      lab.test('2 used. lowest', function (done) {
        var hosts = ['10.0.0.1', '10.0.0.2'];
        var host = ipu.getSmallestAvailableHost(hosts,
          process.env.WEAVE_ROUTER_NETWORK, process.env.WEAVE_ROUTER_CIDR);

        Lab.expect(host).to.equal('10.0.0.3');
        done();
      });
      lab.test('2 used. gap', function (done) {
        var hosts = ['10.0.0.1', '10.0.0.3'];
        var host = ipu.getSmallestAvailableHost(hosts,
          process.env.WEAVE_ROUTER_NETWORK, process.env.WEAVE_ROUTER_CIDR);

        Lab.expect(host).to.equal('10.0.0.2');
        done();
      });
      lab.test('none used', function (done) {
        var hosts = [];
        var host = ipu.getSmallestAvailableHost(hosts,
          process.env.WEAVE_ROUTER_NETWORK, process.env.WEAVE_ROUTER_CIDR);

        Lab.expect(host).to.equal('10.0.0.1');
        done();
      });
    });
    lab.experiment('network address', function () {
      lab.test('none used', function (done) {
        var hosts = [];
        var host = ipu.getSmallestAvailableHost(hosts,
          '10.25.60.0', process.env.WEAVE_NETWORK_CIDR);
        Lab.expect(host).to.equal('10.25.60.1');
        done();
      });
      lab.test('1 used. lowest', function (done) {
        var hosts = ['10.25.60.1'];
        var host = ipu.getSmallestAvailableHost(hosts,
          '10.25.60.0', process.env.WEAVE_NETWORK_CIDR);

        Lab.expect(host).to.equal('10.25.60.2');
        done();
      });
      lab.test('2 used. lowest', function (done) {
        var hosts = ['10.25.60.1', '10.25.60.2'];
        var host = ipu.getSmallestAvailableHost(hosts,
          '10.25.60.0', process.env.WEAVE_NETWORK_CIDR);

        Lab.expect(host).to.equal('10.25.60.3');
        done();
      });
      lab.test('2 used. gap', function (done) {
        var hosts = ['10.25.60.1', '10.25.60.3'];
        var host = ipu.getSmallestAvailableHost(hosts,
          '10.25.60.0', process.env.WEAVE_NETWORK_CIDR);

        Lab.expect(host).to.equal('10.25.60.2');
        done();
      });
      lab.test('all allocated', function (done) {
        var hosts = ['10.77.61.1', '10.77.61.2'];
        var host = ipu.getSmallestAvailableHost(hosts,
          '10.77.61.0', 30);

        Lab.expect(host).to.equal('');
        done();
      });
      lab.test('use all the ips in order', { timeout: 100000 }, function (done) {
        var hosts = [];
        var range = Math.pow(2, 32-process.env.WEAVE_NETWORK_CIDR) - 1;
        for (var i = 1; i < range; i++) {
          var host = ipu.getSmallestAvailableHost(hosts,
            '10.2.60.0', process.env.WEAVE_NETWORK_CIDR);
          var expected = ip.fromLong((ip.toLong('10.2.60.0') + i));
          Lab.expect(host).to.equal(expected);
          hosts.push(host);
        }
        done();
      });
      lab.test('use all the ips in random', { timeout: 100000 }, function (done) {
        var hosts = [];
        var host = 'start';
        var base = '10.17.140.0';
        var range = Math.pow(2, 32-process.env.WEAVE_NETWORK_CIDR) - 1;
        while (host) {
          var randHost = Math.floor((Math.random() * range) + 1);
          var newHost = ip.fromLong((ip.toLong(base) + randHost));
          hosts.push(newHost);

          host = ipu.getSmallestAvailableHost(hosts,
            base, process.env.WEAVE_NETWORK_CIDR);

          if (~hosts.indexOf(host)) {
            console.error('already allocated', hosts, host, newHost, base);
            return done(new Error('already allocated'));
          }

          hosts.push(host);
        }
        done();
      });
    });
  }); // getSmallestAvailableHost
  lab.experiment('getLargestAvailableNetwork', function () {
    lab.test('none used', function (done) {
        var hosts = [];
        var host = ipu.getLargestAvailableNetwork(hosts,
          process.env.WEAVE_ROUTER_CIDR, process.env.WEAVE_NETWORK_CIDR);
        Lab.expect(host).to.equal('10.255.252.0');
        done();
      });
      lab.test('1 used. lowest', function (done) {
        var hosts = ['10.255.252.0'];
        var host = ipu.getLargestAvailableNetwork(hosts,
          process.env.WEAVE_ROUTER_CIDR, process.env.WEAVE_NETWORK_CIDR);

        Lab.expect(host).to.equal('10.255.248.0');
        done();
      });
      lab.test('2 used. lowest', function (done) {
        var hosts = ['10.255.252.0', '10.255.248.0'];
        var host = ipu.getLargestAvailableNetwork(hosts,
          process.env.WEAVE_ROUTER_CIDR, process.env.WEAVE_NETWORK_CIDR);

        Lab.expect(host).to.equal('10.255.244.0');
        done();
      });
      lab.test('2 used. gap', function (done) {
        var hosts = ['10.255.252.0', '10.255.244.0'];
        var host = ipu.getLargestAvailableNetwork(hosts,
          process.env.WEAVE_ROUTER_CIDR, process.env.WEAVE_NETWORK_CIDR);

        Lab.expect(host).to.equal('10.255.248.0');
        done();
      });
      lab.test('all allocated', function (done) {
        var hosts = ['10.128.0.0'];
        var host = ipu.getLargestAvailableNetwork(hosts,
          process.env.WEAVE_ROUTER_CIDR, 9);

        Lab.expect(host).to.equal('');
        done();
      });
      lab.test('use all the ips in order', { timeout: 100000 }, function (done) {
        var hosts = [];
        var networkCidr = 15;
        var routerCidr = 8;
        var range = Math.pow(2, networkCidr-routerCidr) - 1;
        for (var i = range; i > 0; i--) {
          var host = ipu.getLargestAvailableNetwork(hosts, routerCidr, networkCidr);
          var networkIp = ip.fromLong(i * Math.pow(2, 32-networkCidr));
          var expected = ip.or(process.env.WEAVE_ROUTER_NETWORK, networkIp);
          Lab.expect(host).to.equal(expected);
          hosts.push(host);
        }
        done();
      });
      lab.test('use all the ips in random', { timeout: 100000 }, function (done) {
        var hosts = [];
        var host = 'start';
        var networkCidr = 15;
        var routerCidr = 8;
        var range = Math.pow(2, networkCidr-routerCidr) - 1;
        while (host) {
          var randHost = Math.floor((Math.random() * range) + 1);
          var networkIp = ip.fromLong(randHost * Math.pow(2, 32-networkCidr));
          var newHost = ip.or(process.env.WEAVE_ROUTER_NETWORK, networkIp);
          hosts.push(newHost);

          host = ipu.getLargestAvailableNetwork(hosts, routerCidr, networkCidr);

          if (~hosts.indexOf(host)) {
            console.error('already allocated', hosts, host, newHost, routerCidr);
            return done(new Error('already allocated'));
          }

          hosts.push(host);
        }
        done();
      });
  }); //getLargestAvailableNetwork
}); // /lib/helpers/ip-utils.js unit test

