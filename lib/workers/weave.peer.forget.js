/**
 * weave forget
 * @module lib/workers/weave.peer.forget
 */
'use strict'

const InvalidJob = require('error-cat/errors/invalid-job-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const isString = require('101/is-string')
const Promise = require('bluebird')

const Docker = require('../models/docker')
const WeaveWrapper = require('../models/weave-wrapper')

module.exports = function (job) {
  return Promise
    .try(function validateArguments () {
      // format 10.0.0.1:4242
      if (!isString(job.dockerHost)) {
        throw new InvalidJob(
          'Missing dockerHost',
          { job: job }
        )
      }
      if (!isString(job.hostname)) {
        throw new InvalidJob(
          'Missing hostname to delete',
          { job: job }
        )
      }
    })
    .then(function checkDock () {
      return Docker.doesDockExist(job.dockerHost)
    })
    .then(function (exists) {
      if (!exists) {
        throw new WorkerStopError(
          'Dock was removed',
          { job: job }
        )
      }
    })
    .then(function () {
      return WeaveWrapper.forgetAsync(job.dockerHost, job.hostname)
    })
}
