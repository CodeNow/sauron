/**
 * weave forget
 * @module lib/workers/weave.peer.forget
 */
'use strict'
require('loadenv')()

const WorkerStopError = require('error-cat/errors/worker-stop-error')
const Docker = require('../models/docker')
const WeaveWrapper = require('../models/weave-wrapper')
const schemas = require('../models/schemas')

exports.jobSchema = schemas.weavePeerForget

exports.task = (job) => {
  return Docker.doesDockExist(job.dockerHost, job.orgId)
    .tap(function (exists) {
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
