'use strict';
require('loadenv')();

var ip = require('ip');
var Promise = require('bluebird');

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
 * @returns  {Promise} (err)
 */
WeaveSetup.setup = function () {
  return Promise.fromCallback(function (cb) {
    log.info('setup');
    // get router network
    Peers.getList(process.env.ORG_ID, function (err, peers) {
      if (err) { return cb(err); }
      // remove self if exist
      var index = peers.indexOf(ip.address());
      if (index > -1) {
        peers.splice(index, 1);
      }

      WeaveWrapper.launch(peers, cb);
    });
  });
};
