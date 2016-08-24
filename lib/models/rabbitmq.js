'use strict'
require('loadenv')()

const Publisher = require('ponos/lib/rabbitmq')
const uuid = require('uuid')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const log = require('../logger.js')()

/**
 * Module in charge of rabbitmq connection
 *  client and pubSub are singletons
 */
const _publisher = new Publisher({
  name: process.env.APP_NAME,
  hostname: process.env.RABBITMQ_HOSTNAME,
  port: process.env.RABBITMQ_PORT,
  username: process.env.RABBITMQ_USERNAME,
  password: process.env.RABBITMQ_PASSWORD
})

/**
 * Module in charge of rabbitmq connection
 *  client and pubSub are singletons
 */
function RabbitMQ () { }

module.exports = RabbitMQ
module.exports._publisher = _publisher

/**
 * Queues handled
 * @type Array
  var publishedEvents = [
    'container.network.attached'
  ]

  var publishQueues = [
    'dock.lost',
    'weave.kill',
    'weave.start',
    'weave.peer.forget',
    'weave.peer.remove'
  ]
 */

/**
 * Initiate connection to publisher server
 * @returns {Promise}
 * @resolves when connected to rabbit
 */
RabbitMQ.create = function () {
  log.info('create')
  return _publisher.connect()
}

/**
 * disconnect
 * @returns {Promise}
 * @resolves when disconnected to rabbit
 */
RabbitMQ.disconnect = function () {
  log.info('publisher.disconnect')
  return _publisher.disconnect()
}

/**
 * publish container.network.attached
 * @param {Object} data data to pass to job
 * @throws {Error} If missing data
 */
RabbitMQ.publishContainerNetworkAttached = function (data) {
  log.info({ data: data }, 'publisher.publishContainerNetworkAttached')
  RabbitMQ._dataCheck(data, ['id', 'inspectData', 'containerIp'])
  _publisher.publishEvent('container.network.attached', data)
}

/**
 * publish weave.start job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeaveStart = function (data) {
  log.info({ data: data }, 'publisher.publishWeaveStart')
  RabbitMQ._dataCheck(data, ['dockerUri', 'orgId'])
  _publisher.publishTask('weave.start', data)
}

/**
 * publish weave.kill job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeaveKill = function (data) {
  log.info({ data: data }, 'publisher.publishWeaveKill')
  RabbitMQ._dataCheck(data, ['containerId'])
  _publisher.publishTask('weave.kill', data)
}

/**
 * publish weave.peer.forget job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeavePeerForget = function (data) {
  log.info({ data: data }, 'publisher.publishWeavePeerForget')
  RabbitMQ._dataCheck(data, ['dockerHost', 'hostname'])
  _publisher.publishTask('weave.peer.forget', data)
}

/**
 * publish weave.peer.remove job
 * @param {Object} data data to pass to job
 */
RabbitMQ.publishWeavePeerRemove = function (data) {
  log.info({ data: data }, 'publisher.publishWeavePeerRemove')
  RabbitMQ._dataCheck(data, ['dockerHost', 'hostname', 'orgId'])
  _publisher.publishTask('weave.peer.remove', data)
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
      throw new WorkerStopError('data is missing some key', {
        data: data,
        keys: keys
      })
    }
  })
}

/**
 * publish `dock.lost` event
 * @param  {object} data    data to publish to channel, should contain host and githubId
 */
RabbitMQ.publishDockLost = function (data) {
  Object.assign(data, {
    timestamp: new Date(),
    dockerHealthCheckId: uuid()
  })

  RabbitMQ._dataCheck(data, ['host'])
  log.info(data, 'publisher.publishDockLost')
  _publisher.publishTask('dock.lost', data)
}
