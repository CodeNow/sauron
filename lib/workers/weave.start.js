/**
 * start weave container
 * @module lib/workers/weave.start
 */
'use strict'
require('loadenv')()

const Events = require('../models/events.js')
const schemas = require('../models/schemas')

exports.jobSchema = schemas.weaveStart

exports.task = (job) => {
  return Events.handleStartAsync(job)
}
