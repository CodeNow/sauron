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
  tags: joi.string().required(),
  tid: joi.string()
}).unknown().required().label('job')

module.exports.task = function (job) {
  return Promise
    .try(function handleStart () {
      RabbitMQ.publishWeaveStart({
        dockerUri: job.host,
        orgId: job.tags.split(',')[0]
      })
    })
}
