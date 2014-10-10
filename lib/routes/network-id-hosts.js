'use strict';
require('../loadenv.js')();

var network = require('../models/network.js');
var error = require('../helpers/error.js');
var ipu = require('../helpers/ip-utils.js');

/**
 * allocate an ip address for a host on given network
 * return: { hostIp: 'ip.ip.ip.ip' }
 */
function allocate (req, res, next) {
  if (!req.params.networkIp) {
    return next(error.boom(400, 'networkIp missing'));
  }
  if (!ipu.isValidIp(req.params.networkIp)) {
    return next(error.boom(400, 'malformed network ip'));
  }

  network.createHostAddress(req.params.networkIp, function (err, hostIp) {
    if (err) { return next(err); }
    res.status(200).send({
      hostIp: hostIp
    });
  });
}


module.exports.allocate = allocate;
