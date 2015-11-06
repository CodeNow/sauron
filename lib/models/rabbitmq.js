'use strict';
require('loadenv')();

var Hermes = require('runnable-hermes');
var ErrorCat = require('error-cat');
var error = new ErrorCat();
var uuid = require('uuid');
var put = require('101/put');
var ip = require('ip');

var log = require('../logger.js')();

module.exports = RabbitMQ;

/**
 * Module in charge of rabbitmq connection
 *  client and pubSub are singletons
 */
function RabbitMQ () { }

/**
 * rabbitmq _publisher
 * @type {Object}
 */
RabbitMQ._publisher = null;

/**
 * rabbitmq _subscriber (used by ponos)
 * @type {Object}
 */
RabbitMQ._subscriber = null;

/**
 * Queue names for rabbit.
 * @type Array
 */
var publishedEvents = [
  'container.network.attached',
  'container.network.attach-failed'
];

var subscribedEvents = [
  'container.life-cycle.died',
  'container.life-cycle.started'
];

/**
 * Initiate connection to RabbitMQ server
 */
RabbitMQ.create = function () {
  var opts = {
    hostname: process.env.RABBITMQ_HOSTNAME,
    password: process.env.RABBITMQ_PASSWORD,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    name: ip.address() + '.' + process.env.APP_NAME
  };

  log.info(opts, 'create');

  RabbitMQ._subscriber = new Hermes(put({
      subscribedEvents: subscribedEvents,
    }, opts))
    .on('error', RabbitMQ._handleFatalError);

  RabbitMQ._publisher = new Hermes(put({
      publishedEvents: publishedEvents,
    }, opts))
    .connect()
    .on('error', RabbitMQ._handleFatalError);
};

/**
 * returns hermes client
 * @return {Object} hermes client
 */
RabbitMQ.getSubscriber = function () {
  return RabbitMQ._subscriber;
};

/**
 * disconnect
 * @param {Function} cb
 */
RabbitMQ.disconnectPublisher = function (cb) {
  log.info('disconnectPublisher');
  RabbitMQ._publisher.close(cb);
};

/**
 * publish container.network.attached
 * @param {Object} data data to pass to job
 * @throws {Error} If missing data
 */
RabbitMQ.publishContainerNetworkAttached = function (data) {
  log.info({ data: data }, 'publishContainerNetworkAttached');
  RabbitMQ._dataCheck(data, ['containerId', 'containerIp', 'host',
    'instanceId', 'contextVersionId']);
  data.timestamp = new Date();
  data.id = uuid();

  RabbitMQ._publisher.publish('container.network.attached', data);
};

/**
 * publish container.network.attach-failed
 * @param {Object} data data to pass to job
 * @throws {Error} If missing data
 */
RabbitMQ.publishContainerNetworkAttachFailed = function (data) {
  log.info({ data: data }, 'publishContainerNetworkAttachFailed');
  RabbitMQ._dataCheck(data, ['containerId', 'err', 'host',
    'instanceId', 'contextVersionId']);
  data.timestamp = new Date();
  data.id = uuid();

  RabbitMQ._publisher.publish('container.network.attach-failed', data);
};

/**
 * ensures data has required keys, throws if not
 * @param  {object} data object to check
 * @param  {array}  args array of keys to check
 * @throws {Error} If missing data
 */
RabbitMQ._dataCheck = function (data, keys) {
  log.info({ data: data, keys: keys }, '_dataCheck');
  keys.forEach(function (key) {
    if (!data[key]) {
      throw error.createAndReport(400, 'data requires ' + key);
    }
  });
};

/**
 * reports errors on clients
 */
RabbitMQ._handleFatalError = function (err) {
  log.error({ err: err }, '_handleFatalError');
  throw error.createAndReport(502, 'RabbitMQ error', err);
};
