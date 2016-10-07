/**
 * handle docker.events-stream.disconnected
 * @module lib/workers/docker.events-stream.disconnected
 */
'use strict'
require('loadenv')()

const Events = require('../models/events.js')

const schemas = require('../models/schemas')

module.exports.jobSchema = schemas.eventsStreamDisconnected

module.exports.task = (job) => {
  return Events.handleDockerEventStreamDisconnectedAsync(job)
}
