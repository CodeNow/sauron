'use strict';
var Boom = require('boom');
var error = require('../helpers/error');
var redis = require('redis');

var client = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_IPADDRESS,
  { detect_buffers: true });

client.on('error', function onRedisError (err) {
  var boom = Boom.badImplementation('Redis error', err);
  error.log(boom);
  throw err;
});

module.exports = client;
