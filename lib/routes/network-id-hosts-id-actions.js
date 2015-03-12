'use strict';
require('../loadenv.js')();

var weaver = require('../models/weaver.js');

/**
 * attach allocated host ip to a container
 * return: {}
 */
function attach (req, res, next) {
  weaver.attachContainer(
    req.body.containerId,
    req.params.hostIp,
    process.env.WEAVE_NETWORK_CIDR+'',
    req.body.force,
    function (err) {
      if (err) { return next(err); }
      res.status(200).end();
  });
}

function detach (req, res, next) {
  weaver.detachContainer(
    req.body.containerId,
    req.params.hostIp,
    process.env.WEAVE_NETWORK_CIDR+'',
    req.body.force,
    function (err) {
      if (err) { return next(err); }
      res.status(200).end();
  });
}

module.exports.attach = attach;
module.exports.detach = detach;

