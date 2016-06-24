/**
 * weave forget
 * @module lib/workers/weave.peer.remove
 */
'use strict'

const InvalidJob = require('error-cat/errors/invalid-job-error')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const isString = require('101/is-string')
const Promise = require('bluebird')

const Docker = require('../models/docker')
const WeaveWrapper = require('../models/weave-wrapper')

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.dockerHost)) {
        throw new InvalidJob(
          'Missing dockerHost',
          { job: job }
        )
      }
      if (!isString(job.hostname)) {
        throw new InvalidJob(
          'Missing hostname',
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
      // weave stores IP address as nicknames in the format "Nickname": "ip-10-4-145-68.$org-id"
      var nickname = 'ip-' + job.hostname.replace(/\./g, '-') + '.' + job.orgId
      return WeaveWrapper.rmpeerAsync(job.dockerHost, nickname)
    })
}
