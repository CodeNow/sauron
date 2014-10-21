'use strict';
require('../loadenv.js')();

var network = require('../models/network.js');
var error = require('../helpers/error.js');
var ipu = require('../helpers/ip-utils.js');

/**
 * free an ip address for a host on given network
 * return: {}
 */
function free (req, res, next) {
  if (!ipu.isValidIp(req.params.networkIp)) {
    return next(error.boom(400, 'malformed network ip'));
  }
  if (!ipu.isValidIp(req.params.hostIp)) {
    return next(error.boom(400, 'malformed host ip'));
  }

  network.removeHostAddress(req.params.networkIp, req.params.hostIp, function (err) {
    if (err) { return next(err); }
    res.status(200).end();
  });
}

module.exports.free = free;
