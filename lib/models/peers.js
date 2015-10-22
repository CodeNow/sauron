'use strict';
require('loadenv')();

var ip = require('ip');

var redis = require('./redis.js');

var orgId = process.env.ORG_ID;

/**
 * Module used to keep track of weave network peers
 */
function Peers () { }

/**
 * get array of routers across network
 * @param  {Function} cb (err, [peers])
 */
Peers.prototype.getPeers = function (cb) {
  redis.smembers(process.env.WEAVE_PEER_NAMESPACE + orgId, cb);
};

/**
 * add self to list of peers
 * @param  {Function} cb (err)
 */
Peers.prototype.addPeer = function (cb) {
  redis.sadd(process.env.WEAVE_PEER_NAMESPACE + orgId, ip.address(), cb);
};
