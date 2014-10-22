'use strict';
require('../loadenv.js')();

var network = require('../models/network.js');

/**
 * free an ip address for a host on given network
 * return: {}
 */
function free (req, res, next) {
  network.removeHostAddress(req.params.networkIp, req.params.hostIp, function (err) {
    if (err) { return next(err); }
    res.status(200).end();
  });
}

module.exports.free = free;
