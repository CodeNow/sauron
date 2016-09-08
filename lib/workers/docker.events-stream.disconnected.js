/**
 * handle docker.events-stream.disconnected
 * @module lib/workers/docker.events-stream.disconnected
 */
'use strict'
require('loadenv')()

const joi = require('joi')
const Events = require('../models/events.js')

module.exports.jobSchema = joi.object({
  host: joi.string().required(),
  org: joi.string().required(),
  tid: joi.string()
}).unknown().required().label('job')

module.exports.task = (job) => {
  return Events.handleDockerEventStreamDisconnectedAsync(job)
}
