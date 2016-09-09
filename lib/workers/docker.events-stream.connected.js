/**
 * launch weave on new hosts
 * @module lib/workers/docker.events-stream.connected
 */
'use strict'
require('loadenv')()

const Promise = require('bluebird')
const joi = require('joi')
const RabbitMQ = require('../models/rabbitmq.js')

module.exports.jobSchema = joi.object({
  host: joi.string().required(),
  org: joi.string().required(),
  tid: joi.string()
}).unknown().required().label('job')

module.exports.task = (job) => {
  return Promise
    .try(() => {
      RabbitMQ.publishWeaveStart({
        dockerUri: job.host,
        orgId: job.org
      })
    })
}
