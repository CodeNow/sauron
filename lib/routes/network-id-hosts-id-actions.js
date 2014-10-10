'use strict';
require('../loadenv.js')();

var weaver = require('../models/weaver.js');
var error = require('../helpers/error.js');
var ipu = require('../helpers/ip-utils.js');

/**
 * attach allocated host ip to a container
 * return: {}
 */
function attach (req, res, next) {
  if (!req.params.hostIp) {
    return next(error.boom(400, 'hostIp missing'));
  }
  if (!ipu.isValidIp(req.params.hostIp)) {
    return next(error.boom(400, 'malformed host ip'));
  }
  if (!req.body.containerId) {
    return next(error.boom(400, 'containerId missing'));
  }

  weaver.attachContainer(
    req.body.containerId,
    req.params.hostIp,
    process.env.WEAVE_NETWORK_CIDR+'',
    function (err) {
      if (err) { return next(err); }
      res.status(200).end();
  });
}

function detach (req, res, next) {
  if (!req.params.hostIp) {
    return next(error.boom(400, 'hostIp missing'));
  }
  if (!ipu.isValidIp(req.params.hostIp)) {
    return next(error.boom(400, 'malformed host ip'));
  }
  if (!req.body.containerId) {
    return next(error.boom(400, 'containerId missing'));
  }

  weaver.detachContainer(
    req.body.containerId,
    req.params.hostIp,
    process.env.WEAVE_NETWORK_CIDR+'',
    function (err) {
      if (err) { return next(err); }
      res.status(200).end();
  });
}

module.exports.attach = attach;
module.exports.detach = detach;

