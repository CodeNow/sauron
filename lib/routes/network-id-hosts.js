'use strict';
require('./loadenv.js')();

var network = require('../models/network.js');
var Boom = require('boom');

/**
 * allocate an ip address for a host on given network
 * return: { hostIp: 'ip.ip.ip.ip' }
 */
function allocate (req, res, next) {
  if (!req.param.networkIp) {
    return next(Boom.badData('networkIp missing'));
  }

  network.createHostAddress(req.param.networkIp, function(err, hostIp) {
    if (err) { return next(err); }
    res.status(200).send({
      hostIp: hostIp
    });
  });
}

/**
 * free an ip address for a host on given network
 * return: {}
 */
function free (req, res, next) {
  if (!req.param.networkIp) {
    return next(Boom.badData('networkIp missing'));
  }
  if (!req.param.hostIp) {
    return next(Boom.badData('hostIp missing'));
  }

  network.removeHostAddress(req.param.networkIp, req.param.hostIp, function(err) {
    if (err) { return next(err); }
    res.status(200).end();
  });
}

module.exports.allocate = allocate;
module.exports.free = free;

