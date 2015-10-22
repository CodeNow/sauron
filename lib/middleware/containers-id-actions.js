'use strict';

var WeaveWrapper = require('../models/weaver-wrapper.js');

/**
 * attach allocated host ip to a container
 * response body format: JSON
 * { hostIp: '10.0.0.0' }
 * @param  {Object}   req  express request
 * @param  {Object}   res  express response
 * @param  {Function} next express callback
 */
function attach (req, res, next) {
  var weave = new WeaveWrapper();
  weave.attachContainer(req.params.containerId, function (err, hostIp) {
    if (err) { return next(err); }
    res
      .status(200)
      .json({
        hostIp: hostIp
      });
  });
}

module.exports.attach = attach;
