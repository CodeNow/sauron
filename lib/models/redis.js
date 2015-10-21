'use strict';
var redis = require('redis');
module.exports = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_IPADDRESS,
  { detect_buffers: true });

module.exports.pubSub = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_IPADDRESS,
  { detect_buffers: true });

