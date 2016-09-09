/**
 * attach network to container
 * @module lib/workers/container-life-cycle-started
 */
'use strict'
require('loadenv')()

const joi = require('joi')

const Events = require('../models/events.js')

module.exports.maxNumRetries = 4

module.exports.jobSchema = joi.object({
  id: joi.string().required(),
  host: joi.string().required(),
  from: joi.string().required(),
  org: joi.string().required(),
  tid: joi.string()
}).unknown().required().label('job')

module.exports.task = (job) => {
  return Events.handleStartedAsync(job)
}
