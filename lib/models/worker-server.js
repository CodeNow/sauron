'use strict'
require('loadenv')()

const ponos = require('ponos')
const log = require('../logger.js')()

/**
 * The sauron ponos server.
 * @type {ponos~Server}
 * @module sauron/models/worker-server
 */
module.exports = new ponos.Server({
  name: process.env.APP_NAME,
  rabbitmq: {
    channel: {
      prefetch: process.env.WORKER_PREFETCH
    }
  },
  log: log,
  tasks: {
    'weave.kill': require('../workers/weave.kill.js'),
    'weave.start': require('../workers/weave.start.js'),
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
