'use strict';

var WeaveWrapper = require('../models/weave-wrapper.js');

module.exports = ContainersIdActions;

/**
 * handles basics paths
 */
function ContainersIdActions () { }

/**
 * attach allocated host ip to a container
 * response body format: JSON
 * { containerIp0: '10.0.0.0' }
 * @param  {Object}   req  express request
 * @param  {Object}   res  express response
 * @param  {Function} next express callback
 */
ContainersIdActions.attach = function (req, res, next) {
  WeaveWrapper.attach(req.params.containerId, function (err, containerIp) {
    if (err) { return next(err); }
    res
      .status(200)
      .json({
        containerIp: containerIp
      });
  });
};
