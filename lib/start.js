'use strict'
require('loadenv')()

const Docker = require('./models/docker.js')
const log = require('./logger.js')()
const RabbitMQ = require('./models/rabbitmq.js')
const WorkerServer = require('./models/worker-server.js')

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
  return RabbitMQ.connect()
    .then(() => {
      return WorkerServer.start()
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
  return WorkerServer.stop()
    .then(function () {
      return RabbitMQ.disconnect()
    })
    .catch(function (err) {
      log.error({ err: err }, 'Start.startup')
      throw err
    })
    .asCallback(cb)
}
