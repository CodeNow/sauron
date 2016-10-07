/**
 * launch weave on new hosts
 * @module lib/workers/docker.events-stream.connected
 */
'use strict'
require('loadenv')()

const Promise = require('bluebird')
const RabbitMQ = require('../models/rabbitmq')
const schemas = require('../models/schemas')

exports.jobSchema = schemas.eventsStreamConnected

exports.task = (job) => {
  return Promise
    .try(() => {
      RabbitMQ.publishWeaveStart({
        dockerUri: job.host,
        orgId: job.org
      })
    })
}
