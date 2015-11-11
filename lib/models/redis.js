'use strict';

var redis = require('redis');
var ErrorCat = require('error-cat');
var error = new ErrorCat();

var log = require('../logger.js')();

module.exports = Redis;

/**
 * Module in charge of redis connection
 *  client and pubSub are singletons
 */
function Redis () { }

/**
 * normal redis client
 * @type {Object}
 */
Redis.client = null;

/**
 * creates and connects client and pubSub to redis
 * setup error handlers
 */
Redis.connect = function () {
  log.info({
    redisPort: process.env.REDIS_PORT,
    redisAddr: process.env.REDIS_IPADDRESS
  }, 'connect');

  Redis.client = redis.createClient(
    process.env.REDIS_PORT,
    process.env.REDIS_IPADDRESS);

  Redis.client.on('error', Redis._handleError);
};

/**
 * disconnect all redis connections
 */
Redis.disconnect = function () {
  log.info('disconnect');
  Redis.client.quit();
};

/**
 * reports errors on clients
 */
Redis._handleError = function (err) {
  log.error({ err: err }, 'setup');
  throw error.createAndReport(502, 'Redis error', err);
};
