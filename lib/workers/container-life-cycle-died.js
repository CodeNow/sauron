/**
 * checks if the container that died is weave
 * if it is, create a start weave container job
 * @module lib/workers/container-life-cycle-died
 */
'use strict'

const joi = require('joi')
const Events = require('../models/events.js')

module.exports.jobSchema = joi.object({
  id: joi.string().required(),
  host: joi.string().required(),
  from: joi.string().required(),
  tags: joi.string().required(),
  tid: joi.string()
}).unknown().required().label('job')

module.exports = (job) => {
  return Promise.try(() => {
    Events.handleDied(job)
  })
}
