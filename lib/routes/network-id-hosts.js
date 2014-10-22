'use strict';
require('../loadenv.js')();

var network = require('../models/network.js');

/**
 * allocate an ip address for a host on given network
 * return: { hostIp: 'ip.ip.ip.ip' }
 */
function allocate (req, res, next) {

  network.createHostAddress(req.params.networkIp, function (err, hostIp) {
    if (err) { return next(err); }
    res.status(200).send({
      hostIp: hostIp
    });
  });
}


module.exports.allocate = allocate;
