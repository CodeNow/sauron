'use strict';
require('loadenv')();

var ip = require('ip');

var weave = require('../engines/weave-wrapper.js');
var peers = require('./peers.js');

/**
 * Module used for operations involving weave and another service
 */
function WeaveSetup () { }

/**
 * gets peers and connects weave to them
 * @param  {Function} cb (err)
 */
WeaveSetup.setup = function (cb) {
  // get router network
  peers.get(function (err, peers) {
    if (err) { return cb(err); }
    // remove self if exist
    var index = peers.indexOf(ip.address());
    if (index > -1) {
      peers.splice(index, 1);
    }

    var options = {
      peers: peers,
      password: process.env.WEAVE_PASSWORD
    };

    weave.launch(options, function (err) {
      if (err) { return cb(err); }
      peers.add(ip.address(), cb);
    });
  });
};
