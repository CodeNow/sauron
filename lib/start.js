'use strict'

require('loadenv')()
var Promise = require('bluebird')

var Docker = require('./models/docker.js')
var RabbitMQ = require('./models/rabbitmq.js')
var WorkerServer = require('./models/worker-server.js')
var log = require('./logger.js')()

module.exports = Start

/**
 * in charge of starting the application
 */
function Start () { }

/**
 * Start listening for weave container deaths
 * @param  {Function} cb {err}
 * @returns {Promise}
 */
Start.startup = function (cb) {
  return Promise.resolve()
    .then(function () {
      RabbitMQ.create()
      return Promise.promisify(WorkerServer.listen, { context: WorkerServer })()
    })
    .then(function () {
      // Empty string returns all docks
      return Docker.infoAsync()
    })
    .then(function (docks) {
      docks.forEach(function (dockData) {
        RabbitMQ.publishWeaveStart({
          dockerUri: 'http://' + dockData.Host,
          orgId: dockData.Labels.org
        })
      })
    })
    .catch(function (err) {
      log.error({ err: err }, 'Start.startup')
      throw err
    })
    .asCallback(cb)
}

/**
 * Stop listening for weave container deaths
 * @param  {Function} cb {err}
 * @returns {Promise}
 */
Start.shutdown = function (cb) {
  return Promise.resolve()
    .then(function () {
      return Promise.promisify(WorkerServer.stop, { context: WorkerServer })()
    })
    .then(function () {
      return Promise.promisify(RabbitMQ.disconnectPublisher, { context: RabbitMQ })()
    })
    .catch(function (err) {
      log.error({ err: err }, 'Start.startup')
      throw err
    })
    .asCallback(cb)
}
