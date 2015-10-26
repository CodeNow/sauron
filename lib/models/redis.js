'use strict';

var redis = require('redis');
var ErrorCat = require('error-cat');
var error = new ErrorCat();

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
 * pubsub redis client
 * @type {Object}
 */
Redis.pubSub = null;

/**
 * creates and connects client and pubSub to redis
 * setup error handlers
 */
Redis.connect = function() {
  Redis.client = redis.createClient(
    process.env.REDIS_PORT,
    process.env.REDIS_IPADDRESS);

  Redis.client.on('error', Redis._handleError);

  Redis.pubSub = redis.createClient(
    process.env.REDIS_PORT,
    process.env.REDIS_IPADDRESS);

  Redis.pubSub.on('error', Redis._handleError);
};

/**
 * disconnect all redis connections
 */
Redis.disconnect = function() {
  Redis.client.quit();
  Redis.pubSub.quit();
};

/**
 * reports errors on clients
 */
Redis._handleError = function (err) {
  throw error.createAndReport(502, 'Redis error', err);
};
