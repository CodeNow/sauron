/**
 * launch weave on new hosts
 * @module lib/workers/docker.events-stream.connected
 */
'use strict'

const Promise = require('bluebird')
const InvalidJob = require('error-cat/errors/invalid-job-error')

const Events = require('../models/events.js')
const RabbitMQ = require('../models/rabbitmq.js')

module.exports = function (job) {
  return Promise
    .try(function validateArguments () {
      if (!Events.validateDockerJob(job)) {
        throw new InvalidJob(
          'Job missing host or tags key',
          { job: job }
        )
      }
    })
    .then(function handleStart () {
      RabbitMQ.publishWeaveStart({
        dockerUri: job.host,
        orgId: job.tags.split(',')[0]
      })
    })
}
