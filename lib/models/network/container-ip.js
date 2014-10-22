'use strict';
require('../../loadenv.js')();

var redis = require('../redis.js');
var error = require('../../helpers/error.js');

/**
 * set container to ip mapping
 * @param 'string'   containerId id of container
 * @param 'string'   ipaddr      ip addr to attach to container
 * @param {Function} cb          (err)
 */
function setContainerIp(containerId, ipaddr, cb) {
  var key = process.env.WEAVE_NETWORKS+':container';
  var errData = {
    newContainerId: containerId,
    newIp: ipaddr
  };
  redis.hgetall(key, function(err, containersMapped) {
    if (err) {return cb(err); }

    var ip = null;
    for (var prop in containersMapped) {
      if (containersMapped[prop] === containerId) {
        ip = prop;
        break;
      }
    }

    if (ip) {
      errData.oldContainerId = containersMapped[ip];
      errData.oldIp = ip;
      return cb(error.boom(409, 'container already mapped to ip', errData));
    }

    redis.hsetnx(key, ipaddr, containerId, function (err, status) {
        if (err) { return cb(err); }
        // if already exist means we have not deallocated this IP
        if (status === '0') {
          return cb(error.boom(409, 'ip already mapped to a container', errData));
        }

        return cb();
    });
  });
}

/**
 * removes container to ip mapping
 * @param 'string'   containerId id of container
 * @param 'string'   ipaddr      ip addr to attach to container
 * @return function (err)
 */
function removeContainerIp(containerId, ipaddr, cb) {
  var key = process.env.WEAVE_NETWORKS+':container';
  var errData = {
    ip: ipaddr,
    newContainer: containerId
  };
  redis.hget(key, ipaddr, function(err, containerMapped) {
    if (err) {return cb(err); }
    errData.oldContainer = containerMapped;

    if (!containerMapped) {
      return cb(error.boom(409, 'container ip does not exist', errData));
    }

    if (containerMapped !== containerId) {
      return cb(error.boom(409, 'ip is mapped to a different container', errData));
    }
    redis.hdel(key, ipaddr, function (err, status) {
      if (err) { return cb(err); }

      if (status === '0') {
        return cb(error.boom(404, 'container IP does not exist', errData));
      }
      cb();
    });
  });
}

/**
 * get ip of mapped container
 * @param 'string'   containerId id of container
 * @return function (err, ipaddr)
 */
function getContainerIp(containerId, cb) {
  var key = process.env.WEAVE_NETWORKS+':container';
  redis.hgetall(key, function(err, containersMapped) {
    if (err) {return cb(err); }

    var ip = null;
    for (var prop in containersMapped) {
      if (containersMapped[prop] === containerId) {
        ip = prop;
        break;
      }
    }

    if (!ip) {
      return cb(error.boom(404, 'container does not have ip', {
        containerId: containerId
      }));
    }
    return cb(null, ip);
  });
}

module.exports.setContainerIp = setContainerIp;
module.exports.removeContainerIp = removeContainerIp;
module.exports.getContainerIp = getContainerIp;