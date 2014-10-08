'use strict';
require('./loadenv.js')();

var network = require('../models/network.js');
var Boom = require('boom');

/**
 * attach allocated host ip to a container
 * return: {}
 */
function attach (req, res, next) {
  if (!req.param.hostIp) {
    return next(Boom.badData('hostIp missing'));
  }
  if (!req.param.containerId) {
    return next(Boom.badData('containerId missing'));
  }

  network.attachContainer(
    req.param.containerId,
    req.param.hostIp,
    process.env.WEAVE_NETWORK_CIDR,
    function(err) {
      if (err) { return next(err); }
      res.status(200).end();
  });
}

function detach (req, res, next) {
  if (!req.param.hostIp) {
    return next(Boom.badData('hostIp missing'));
  }
  if (!req.param.containerId) {
    return next(Boom.badData('containerId missing'));
  }

  network.detachContainer(
    req.param.containerId,
    req.param.hostIp,
    process.env.WEAVE_NETWORK_CIDR,
    function(err) {
      if (err) { return next(err); }
      res.status(200).end();
  });
}

module.exports.allocate = attach;
module.exports.detach = detach;

