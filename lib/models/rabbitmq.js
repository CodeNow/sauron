'use strict';

var hermesClient = require('runnable-hermes');
var ErrorCat = require('error-cat');
var error = new ErrorCat();
var uuid = require('uuid');

module.exports = RabbitMq;

/**
 * Module in charge of rabbitmq connection
 *  client and pubSub are singletons
 */
function RabbitMq () { }

/**
 * rabbitmq client
 * @type {Object}
 */
RabbitMq.client = null;

/**
 * Queue names for rabbit.
 * @type Array
 */
var queues = [
  'container-network-attached'
];

/**
 * Initiate connection to RabbitMq server
 */
RabbitMq.connect = function () {
  var opts = {
    hostname: process.env.RABBITMQ_HOSTNAME,
    password: process.env.RABBITMQ_PASSWORD,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    queues: queues
  };

  RabbitMq.client = hermesClient
    .hermesSingletonFactory(opts)
    .connect()
    .on('error', RabbitMq._handleFatalError);
};

/**
 * disconnect
 * @param {Function} cb
 */
RabbitMq.disconnect = function (cb) {
  RabbitMq.client.close(cb);
};

/**
 * publish container-network-attached
 * @param {Object} data data to pass to job
 * @throws {Error} If missing data
 */
RabbitMq.publishContainerNetworkAttached = function (data) {
  RabbitMq._dataCheck(data, ['containerId', 'containerIp']);
  data.timestamp = new Date();
  data.id = uuid();

  RabbitMq.client.publish('container-network-attached', data);
};


/**
 * ensures data has required keys, throws if not
 * @param  {object} data object to check
 * @param  {array}  args array of keys to check
 * @throws {Error} If missing data
 */
RabbitMq._dataCheck = function (data, keys) {
  keys.forEach(function (key) {
    if (!data[key]) {
      throw error.createAndReport(400, 'data requires ' + key);
    }
  });
};

/**
 * reports errors on clients
 */
RabbitMq._handleFatalError = function (err) {
  throw error.createAndReport(502, 'RabbitMq error', err);
};

