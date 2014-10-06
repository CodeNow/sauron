'use strict';
var ip = require('ip');
var redis = require('./redis.js');
/**
 * get list of routers across network
 * @param  {Function} cb (err, peers)
 */
function getRouters (cb) {
  redis.hkeys(process.env.WEAVE_ROUTERS, function(err, routers) {
    if(err) { return cb(err); }
    if(!routers || typeof routers !== 'object') {
      return cb(error.create('redis failed to get keys', routers));
    }

  });
}

module.exports.getRouters = getRouters;
module.exports.addRouter = addRouter;
module.exports.removeRouterIp = removeRouterIp;
