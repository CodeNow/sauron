'use strict';
var ip = require('ip');
var docker = require('../../test/fixtures/docker.js').client;

// checks if weave was launched or not
var launched = false;

// holds all the mock functions
var mocks = {
  launch: mockLaunch,
  attach: mockAttach
};

// mocking logic
var weave = function (cmd, cb) {
  var args = cmd.split(' ');
  if (args[0] !== 'weave') {
    return cb(new Error('launching non weave command'));
  }
  if (!~mocks[args[1]]) {
    return cb(new Error('weave does not support cmd: ' + args[1]));
  }
  args.push(cb);
  mocks[args[1]].apply(null, args.slice(2));
};

function mockLaunch () {
  var cb = arguments[arguments.length-1];
  if(launched) {
    return cb('weave is already running.');
  }
  launched = true;
  return cb(null, 'Network 10.0.0.0/8 overlaps with existing route 10.20.128.0/17 on host.
WARNING: Specified --ipalloc-range 10.0.0.0/8 overlaps with existing route on host.
Unless this is deliberate, you must pick another range and set it on all hosts.
8dd84c1f9c3083ee9fd039105de2c5a181d5481f7fdbd45152d801db7cee2c3d');
}

function mockAttach (cidr, containerId, cb) {
  if (cidr.split('/')[1] > 32) {
    return cb(new Error('Invalid CIDR: '+cidr+'\n CIDR must of be of form ' +
      '<ip_address>/<routing_prefix_length>, e.g. 10.0.1.1/24'));
  }
  try {
    ip.cidrSubnet(cidr);
  } catch(err) {
    if (err) {
      return cb(new Error('Failure during network configuration for container ' +
        containerId + ':\n Error: an inet prefix is expected rather than '+cidr));
    }
  }

  docker.getContainer(containerId).inspect(function(err, data) {
    if (err) {
      if (err.statusCode === 404 && err.reason === 'no such container') {
        return cb(new Error('Error: No such image or container: '+containerId));
      }
      return cb(err);
    }
    if(!data.State.Running) {
      return cb(new Error('Container '+containerId+' not running'));
    }
    return cb();
  });
}

function mockStatus(cb) {
  if (!launched) {
    return cb(new Error('weave container is not present; have you launched it?'));
  }

  return cb(null, ['',
'       Version: 1.1.2',
'',
'       Service: router',
'      Protocol: weave 1..2',
'          Name: 56:c7:08:af:6b:dd(ip-10-20-219-180)',
'    Encryption: disabled',
' PeerDiscovery: enabled',
'       Targets: 0',
'   Connections: 0',
'         Peers: 1',
'',
'       Service: ipam',
'     Consensus: achieved',
'         Range: [10.0.0.0-11.0.0.0)',
' DefaultSubnet: 10.0.0.0/8'].join('\n'));
}

module.exports = weave;
