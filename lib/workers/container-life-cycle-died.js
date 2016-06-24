/**
 * checks if the container that died is weave
 * if it is, create a start weave container job
 * @module lib/workers/container-life-cycle-died
 */
'use strict'

const InvalidJob = require('error-cat/errors/invalid-job-error')
const Promise = require('bluebird')

const Events = require('../models/events.js')

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!Events.validateContainerJob(job)) {
        throw new InvalidJob(
          'Job id, host, tags, or from keys',
          { job: job }
        )
      }
    })
    .then(function handleDied () {
      Events.handleDied(job)
    })
}
