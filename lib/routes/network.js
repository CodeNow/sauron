'use strict';
require('./loadenv.js')();

var network = require('../models/network.js');
var ip = require('ip');
var Boom = require('boom');

/**
 * allocate a network for a group of containers
 * return: { networkIp: 'ip.ip.ip.ip' }
 */
function allocate (req, res, next) {
  var tag = req.query.tag || req.body.tag || ip.address;
  network.createNetworkAddress(tag, function(err, networkIp) {
    if (err) { return next(err); }
    res.status(200).send({
      networkIp: networkIp
    });
  });
}

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

module.exports.allocate = allocate;
module.exports.free = free;

