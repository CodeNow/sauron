/**
 * handle docker.events-stream.disconnected
 * @module lib/workers/docker.events-stream.disconnected
 */
'use strict'

const InvalidJob = require('error-cat/errors/invalid-job-error')
const isString = require('101/is-string')
const Promise = require('bluebird')

const Events = require('../models/events.js')

module.exports = function (job) {
  return Promise
    .try(function validateArguments () {
      if (!isString(job.host)) {
        throw new InvalidJob(
          'Missing host',
          { job: job }
        )
      }
      if (!isString(job.org)) {
        throw new InvalidJob(
          'Missing githubId',
          { job: job }
        )
      }
    })
    .then(function () {
      return Events.handleDockerEventStreamDisconnectedAsync(job)
    })
}
