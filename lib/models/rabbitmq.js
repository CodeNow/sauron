'use strict'
require('loadenv')()

var Hermes = require('runnable-hermes')
var ErrorCat = require('error-cat')
var error = new ErrorCat()
var put = require('101/put')
var assign = require('101/assign')
var uuid = require('uuid')
var TaskFatalError = require('ponos').TaskFatalError

var log = require('../logger.js')()

module.exports = RabbitMQ

/**
 * Module in charge of rabbitmq connection
 *  client and pubSub are singletons
 */
function RabbitMQ () { }

/**
 * rabbitmq _publisher
 * @type {Object}
 */
RabbitMQ._publisher = null

/**
 * rabbitmq _subscriber (used by ponos)
 * @type {Object}
 */
RabbitMQ._subscriber = null

/**
 * Queue names for rabbit.
 * @type Array
 */
var publishedEvents = [
  'container.network.attached'
]

var subscribedEvents = [
  'container.life-cycle.died',
  'container.life-cycle.started',
  'docker.events-stream.connected',
  'docker.events-stream.disconnected'
]

var publishQueues = [
  'on-dock-unhealthy',
  'weave.health.check',
  'weave.kill',
  'weave.start',
  'weave.peer.forget',
  'weave.peer.remove'
]

var subscribeQueues = [
  'weave.start',
  'weave.health.check',
  'weave.kill',
  'weave.peer.forget',
  'weave.peer.remove'
]

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
  }

  log.info(opts, 'create')

  RabbitMQ._subscriber = new Hermes(put({
    queues: subscribeQueues,
    subscribedEvents: subscribedEvents
  }, opts))
  .on('error', RabbitMQ._handleFatalError)

  RabbitMQ._publisher = new Hermes(put({
    publishedEvents: publishedEvents,
    queues: publishQueues
  }, opts))
  .connect()
  .on('error', RabbitMQ._handleFatalError)
}

/**
 * returns hermes client
 * @return {Object} hermes client
 */
RabbitMQ.getSubscriber = function () {
  return RabbitMQ._subscriber
}

/**
 * disconnect
 * @param {Function} cb
 */
RabbitMQ.disconnectPublisher = function (cb) {
  log.info('RabbitMQ.disconnectPublisher')
  RabbitMQ._publisher.close(cb)
}

/**
 * publish container.network.attached
 * @param {Object} data data to pass to job
 * @throws {Error} If missing data
 */
RabbitMQ.publishContainerNetworkAttached = function (data) {
  log.info({ data: data }, 'RabbitMQ.publishContainerNetworkAttached')
  RabbitMQ._dataCheck(data, ['id', 'inspectData', 'containerIp'])
  RabbitMQ._publisher.publish('container.network.attached', data)
}

/**
 * publish weave.start job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeaveStart = function (data) {
  log.info({ data: data }, 'RabbitMQ.publishWeaveStart')
  RabbitMQ._dataCheck(data, ['dockerUri', 'orgId'])
  RabbitMQ._publisher.publish('weave.start', data)
}

/**
 * publish weave.kill job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeaveKill = function (data) {
  log.info({ data: data }, 'RabbitMQ.publishWeaveKill')
  RabbitMQ._dataCheck(data, ['containerId'])
  RabbitMQ._publisher.publish('weave.kill', data)
}

/**
 * publish weave.health.check job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeaveHealthCheck = function (data) {
  log.info({ data: data }, 'RabbitMQ.publishWeaveHealthCheck')
  RabbitMQ._dataCheck(data, ['containerId', 'delay'])
  RabbitMQ._publisher.publish('weave.health.check', data)
}

/**
 * publish weave.peer.forget job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeavePeerForget = function (data) {
  log.info({ data: data }, 'RabbitMQ.publishWeavePeerForget')
  RabbitMQ._dataCheck(data, ['dockerHost', 'hostname'])
  RabbitMQ._publisher.publish('weave.peer.forget', data)
}

/**
 * publish weave.peer.remove job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeavePeerRemove = function (data) {
  log.info({ data: data }, 'RabbitMQ.publishWeavePeerRemove')
  RabbitMQ._dataCheck(data, ['dockerHost', 'hostname', 'orgId'])
  RabbitMQ._publisher.publish('weave.peer.remove', data)
}

/**
 * ensures data has required keys, throws if not
 * @param  {object} data object to check
 * @param  {array}  args array of keys to check
 * @throws {Error} If missing data
 */
RabbitMQ._dataCheck = function (data, keys) {
  log.info({ data: data, keys: keys }, 'RabbitMQ._dataCheck')
  keys.forEach(function (key) {
    if (!data[key]) {
      log.error({ data: data, keys: keys }, '_dataCheck is missing some key')
      throw new TaskFatalError('_dataCheck', 'data is missing some key', {
        data: data,
        keys: keys
      })
    }
  })
}

/**
 * publish on-dock-unhealthy event
 * @param  {object} data    data to publish to channel, should contain host and githubId
 */
RabbitMQ.publishOnDockUnhealthy = function (data) {
  assign(data, {
    timestamp: new Date(),
    dockerHealthCheckId: uuid()
  })

  RabbitMQ._dataCheck(data, ['host', 'githubId'])
  log.info(data, 'RabbitMQ.publishOnDockUnhealthy')
  RabbitMQ._publisher.publish('on-dock-unhealthy', data)
}

/**
 * reports errors on clients
 */
RabbitMQ._handleFatalError = function (err) {
  log.error({ err: err }, 'RabbitMQ._handleFatalError')
  throw error.createAndReport(502, 'RabbitMQ error', err)
}
