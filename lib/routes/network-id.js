'use strict';
require('../loadenv.js')();

var Boom = require('boom');
var network = require('../models/network.js');

/**
 * allocate a network for a group of containers
 * return: {}
 */
function free (req, res, next) {
  if (!req.param.networkId) {
    return next(Boom.badData('networkId missing'));
  }

  network.removeNetworkAddress(req.param.networkId, function(err) {
    if (err) { return next(err); }
    res.status(200).end();
  });
}

module.exports.free = free;
