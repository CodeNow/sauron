/**
 * start weave container
 * @module lib/workers/weave-start
 */
'use strict'

const joi = require('joi')
const Events = require('../models/events.js')
console.log('aaaaa111', Events)
module.exports.jobSchema = joi.object({
  dockerUri: joi.string().required(),
  orgId: joi.string().required(),
  tid: joi.string()
}).unknown().required().label('job')

module.exports.task = (job) => {
  return Events.handleStartAsync(job)
}
