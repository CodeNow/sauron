'use strict';
var ip = require('ip');
var docker = require('../../test/fixtures/docker.js').client;
var networkMap = {};

// checks if weave was launched or not
var launched = false;

// holds all the mock functions
var mocks = {
  setup: mockSetup,
  launch: mockLaunch,
  attach: mockAttach,
  detach: mockDetach,
  status: mockStatus
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

// mock functions
function mockSetup (cb) {
  cb(null, "Pulling repository zettio/weave" +
  "d125837cefa1: Download complete" +
  "511136ea3c5a: Download complete" +
  "f68ba68c4708: Download complete" +
  "4b67b7bcc993: Download complete" +
  "1227576fa113: Download complete" +
  "Status: Image is up to date for zettio/weave:0.8.0" +
  "Pulling repository zettio/weavedns" +
  "4e94948cd710: Download complete" +
  "511136ea3c5a: Download complete" +
  "f68ba68c4708: Download complete" +
  "4b67b7bcc993: Download complete" +
  "8a3e7492759a: Download complete" +
  "ad14632b52e3: Download complete" +
  "Status: Image is up to date for zettio/weavedns:0.8.0" +
  "Pulling repository zettio/weavetools" +
  "6e956e3a67c6: Download complete" +
  "511136ea3c5a: Download complete" +
  "f68ba68c4708: Download complete" +
  "Status: Image is up to date for zettio/weavetools:0.8.0");
}

function mockLaunch () {
  var cb = arguments[arguments.length-1];
  if(launched) {
    return cb("weave is already running");
  }
  launched = true;
  return cb(null, "e521bb239e333fb9ed77cf5a63700389a068e470bad00eda06dafa9e8332ade5");
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
    networkMap[containerId] = cidr;
    return cb();
  });
}

function mockDetach (cidr, containerId, cb) {
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
    if (!networkMap[containerId]) {
      return cb(new Error('Device "ethwe" does not exist.'));
    }
    delete networkMap[containerId];
    return cb();
  });
}

function mockStatus(cb) {
  if (!launched) {
    return cb(new Error('weave container is not present; have you launched it?'));
  }
  return cb(null, 'Our name is 7a:19:f6:1d:5e:d4 ' +
    'Sniffing traffic on &{311 65535 ethwe 62:45:cb:53:a1:6a up|broadcast|multicast} ' +
    'MACs: ' +
    '62:45:cb:53:a1:6a -> 7a:19:f6:1d:5e:d4 (2014-11-07 22:23:06.092963475 +0000 UTC) ' +
    '6e:4c:93:e8:ba:e9 -> 7a:19:f6:1d:5e:d4 (2014-11-07 22:23:06.76403584 +0000 UTC) ' +
    'Peers: ' +
    'Peer 7a:19:f6:1d:5e:d4 (v0) (UID 7283111983749459475) ' +
    'Topology: ' +
    'unicast: ' +
    '7a:19:f6:1d:5e:d4 -> 00:00:00:00:00:00 ' +
    'broadcast: ' +
    '7a:19:f6:1d:5e:d4 -> [] ' +
    'Reconnects:');
}

module.exports = weave;

module.exports.set = function(func, mock) {
  if (!~mocks[func]) {
    throw new Error('weave does not support cmd: ' + func);
  }
  mocks[func] = mock;
};

module.exports.reset = function(cb) {
  mocks = {
    setup: mockSetup,
    launch: mockLaunch,
    attach: mockAttach,
    detach: mockDetach,
    status: mockStatus
  };
  launched = false;
  cb();
};
