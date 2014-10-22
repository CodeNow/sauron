'use strict';
require('../loadenv.js')();

var network = require('../models/network.js');

/**
 * allocate a network for a group of containers
 * return: {}
 */
function free (req, res, next) {
  network.removeNetworkAddress(req.params.networkIp, function (err) {
    if (err) { return next(err); }
    res.status(200).end();
  });
}

module.exports.free = free;
