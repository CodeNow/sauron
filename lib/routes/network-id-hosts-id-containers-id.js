'use strict';
require('../loadenv.js')();

var containerIp = require('../models/network/container-ip.js');

/**
 * free an ip address for a host on given network
 * return: {}
 */
function getMapping (req, res, next) {
  containerIp.getContainerIp(req.params.containerId, function (err, ip) {
    if (err) { return next(err); }
    res.status(200).send({
      ip: ip
    });
  });
}

module.exports.getMapping = getMapping;
