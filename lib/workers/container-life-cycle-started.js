/**
 * attach network to container
 * @module lib/workers/container-life-cycle-started
 */
'use strict'
require('loadenv')()

const Events = require('../models/events.js')
const schemas = require('../models/schemas')

exports.maxNumRetries = 4

exports.jobSchema = schemas.containerLifeCycleStarted

exports.task = (job) => {
  return Events.handleStartedAsync(job)
}
