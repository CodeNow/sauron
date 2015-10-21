'use strict';
require('../loadenv.js')();

var weaver = require('../models/weaver.js');

/**
 * attach allocated host ip to a container
 * return: {}
 */
function attach (req, res, next) {
  weaver.attachContainer(
    req.params.containerId,
    function (err) {
      if (err) { return next(err); }
      res.status(200).end();
  });
}

function detach (req, res, next) {
  weaver.detachContainer(
    req.params.containerId,
    function (err) {
      if (err) { return next(err); }
      res.status(200).end();
  });
}

module.exports.attach = attach;
module.exports.detach = detach;

