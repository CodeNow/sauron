/**
 * attach network to container
 * @module lib/workers/container-life-cycle-started
 */
'use strict'

const Promise = require('bluebird')
const InvalidJob = require('error-cat/errors/invalid-job-error')

const Events = require('../models/events.js')

module.exports = function (job) {
  return Promise
    .try(function validateArguments () {
      if (!Events.validateContainerJob(job)) {
        throw new InvalidJob(
          'Job id, host, or from keys',
          { job: job }
        )
      }
    })
    .then(function handleStarted () {
      return Events.handleStartedAsync(job)
    })
}
