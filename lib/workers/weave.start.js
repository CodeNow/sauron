/**
 * start weave container
 * @module lib/workers/weave.start
 */
'use strict'
require('loadenv')()

const Events = require('../models/events.js')
const schemas = require('../models/schemas')

module.exports.jobSchema = schemas.weaveStart

module.exports.maxNumRetries = 4

module.exports.task = (job) => {
  return Events.handleStartAsync(job)
}
