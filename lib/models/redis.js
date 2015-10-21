'use strict';
var redis = require('redis');
var redisPubSub = require('redis-pubsub-emitter');

module.exports = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_IPADDRESS,
  { detect_buffers: true });

module.exports.pubSub = redisPubSub.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_IPADDRESS);

