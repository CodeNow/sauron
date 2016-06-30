'use strict'
require('loadenv')()

var Docker = require('./models/docker.js')
var log = require('./logger.js')()
var RabbitMQ = require('./models/rabbitmq.js')
var WorkerServer = require('./models/worker-server.js')

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
  return RabbitMQ.create()
    .then(() => {
      return WorkerServer.listen()
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
