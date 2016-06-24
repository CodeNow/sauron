/**
 * start weave container
 * @module lib/workers/weave-start
 */
'use strict'

const InvalidJob = require('error-cat/errors/invalid-job-error')
const isString = require('101/is-string')
const Promise = require('bluebird')

const Events = require('../models/events.js')

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.dockerUri)) {
        throw new InvalidJob(
          'Missing dockerUri',
          { job: job }
        )
      }
      if (!isString(job.orgId)) {
        throw new InvalidJob(
          'Missing orgId',
          { job: job }
        )
      }
    })
    .then(function startWeave () {
      return Events.handleStartAsync(job)
    })
}
