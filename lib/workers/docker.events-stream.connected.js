/**
 * launch weave on new hosts
 * @module lib/workers/docker.events-stream.connected
 */
'use strict'

var Promise = require('bluebird')
var TaskFatalError = require('ponos').TaskFatalError

var Events = require('../models/events.js')
var RabbitMQ = require('../models/rabbitmq.js')

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!Events.validateDockerJob(job)) {
        throw new TaskFatalError(
          'docker.events-stream.connected',
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
