'use strict';
require('loadenv')();

var ip = require('ip');

var WeaveWrapper = require('./weave-wrapper.js');
var Peers = require('./peers.js');
var log = require('../logger.js')();

module.exports = WeaveSetup;

/**
 * Module used for operations involving weave and another service
 */
function WeaveSetup () { }

/**
 * gets peers and connects weave to them
 * @param  {Function} cb (err)
 */
WeaveSetup.setup = function (cb) {
  log.info('setup');
  // get router network
  Peers.getList(function (err, peers) {
    if (err) { return cb(err); }
    // remove self if exist
    var index = peers.indexOf(ip.address());
    if (index > -1) {
      peers.splice(index, 1);
    }

    WeaveWrapper.launch(peers, function (err) {
      if (err) { return cb(err); }
      Peers.addSelf(cb);
    });
  });
};
