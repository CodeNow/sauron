'use strict';
require('loadenv')();

var Hermes = require('runnable-hermes');
var ErrorCat = require('error-cat');
var error = new ErrorCat();
var put = require('101/put');
var assign = require('101/assign');
var uuid = require('uuid');
var TaskFatalError = require('ponos').TaskFatalError;

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
  'container.network.attached'
];

var subscribedEvents = [
  'container.life-cycle.died',
  'container.life-cycle.started',
  'docker.events-stream.connected',
  'dock.removed'
];

var publishQueues = [
  'on-dock-unhealthy',
  'weave.start',
  'weave.forget'
];

var subscribeQueues = [
  'weave.start',
  'weave.forget'
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
    name: process.env.APP_NAME
  };

  log.info(opts, 'create');

  RabbitMQ._subscriber = new Hermes(put({
      queues: subscribeQueues,
      subscribedEvents: subscribedEvents,
    }, opts))
    .on('error', RabbitMQ._handleFatalError);

  RabbitMQ._publisher = new Hermes(put({
      publishedEvents: publishedEvents,
      queues: publishQueues
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
  RabbitMQ._dataCheck(data, ['id', 'inspectData', 'containerIp']);
  RabbitMQ._publisher.publish('container.network.attached', data);
};

/**
 * publish weave.start job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeaveStart = function (data) {
  log.info({ data: data }, 'publishWeaveStart');
  RabbitMQ._dataCheck(data, ['dockerUri', 'orgId']);
  RabbitMQ._publisher.publish('weave.start', data);
};

/**
 * publish weave.forget job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeaveForget = function (data) {
  log.info({ data: data }, 'publishWeaveStart');
  RabbitMQ._dataCheck(data, ['dockerUri', 'host']);
  RabbitMQ._publisher.publish('weave.forget', data);
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
      log.error({ data: data, keys: keys }, '_dataCheck is missing some key');
      throw new TaskFatalError('_dataCheck', 'data is missing some key', {
        data: data,
        keys: keys
      });
    }
  });
};

/**
 * publish on-dock-unhealthy event
 * @param  {object} data    data to publish to channel, should contain host and githubId
 */
RabbitMQ.publishOnDockUnhealthy = function (data) {
  assign(data, {
    timestamp: new Date(),
    dockerHealthCheckId: uuid()
  });

  RabbitMQ._dataCheck(data, ['host', 'githubId']);
  log.info(data, 'RabbitMQ.publishOnDockUnhealthy');
  RabbitMQ._publisher.publish('on-dock-unhealthy', data);
};

/**
 * reports errors on clients
 */
RabbitMQ._handleFatalError = function (err) {
  log.error({ err: err }, '_handleFatalError');
  throw error.createAndReport(502, 'RabbitMQ error', err);
};
