'use strict';
require('../loadenv.js')();

var network = require('../models/network.js');
var error = require('../helpers/error.js');
var ipu = require('../helpers/ip-utils.js');

/**
 * allocate a network for a group of containers
 * return: {}
 */
function free (req, res, next) {
  if (!ipu.isValidIp(req.params.networkIp)) {
    return next(error.boom(400, 'malformed network ip'));
  }

  network.removeNetworkAddress(req.params.networkIp, function (err) {
    if (err) { return next(err); }
    res.status(200).end();
  });
}

module.exports.free = free;
