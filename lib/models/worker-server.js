'use strict'
require('loadenv')()

var ponos = require('ponos')

var log = require('../logger.js')()

module.exports = WorkerServer

/**
 * Module used to listen for and handle runnable events
 */
function WorkerServer () { }

/**
 * ponos worker server
 * @type {Object}
 */
WorkerServer._server = null

/**
 * setup ponos server with tasks
 * @returns {Promise}
 * @resolves (null) if worker started
 * @rejects (Error) if error starting
 */
WorkerServer.listen = function () {
  log.info('listen')

  WorkerServer._server = new ponos.Server({
    name: process.env.APP_NAME,
    log: log,
    tasks: {
      'weave.health.check': require('../workers/weave.health.check.js'),
      'weave.kill': require('../workers/weave.kill.js'),
      'weave.start': require('../workers/weave-start.js'),
      'weave.peer.forget': require('../workers/weave.peer.forget.js'),
      'weave.peer.remove': require('../workers/weave.peer.remove.js')
    },
    events: {
      'container.life-cycle.died': require('../workers/container-life-cycle-died.js'),
      'container.life-cycle.started': require('../workers/container-life-cycle-started.js'),
      'docker.events-stream.connected': require('../workers/docker.events-stream.connected.js'),
      'docker.events-stream.disconnected': require('../workers/docker.events-stream.disconnected.js')
    }
  })

  return WorkerServer._server
    .start()
    .then(function () {
      log.trace('worker server started')
    })
    .catch(function (err) {
      log.error({ err: err }, 'worker server failed to started')
      throw err
    })
}

/**
 * closes the server
 * @returns {Promise}
 * @resolves (null) if worker started
 * @rejects (Error) if error starting
 */
WorkerServer.stop = function (cb) {
  log.info('stop')

  return WorkerServer._server
    .stop()
    .then(function () {
      log.trace('worker server stopped')
    })
    .catch(function (err) {
      log.error({ err: err }, 'worker server failed to stop')
      throw err
    })
}
