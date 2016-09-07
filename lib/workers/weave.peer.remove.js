/**
 * weave forget
 * @module lib/workers/weave.peer.remove
 */
'use strict'

const joi = require('joi')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const Docker = require('../models/docker')
const WeaveWrapper = require('../models/weave-wrapper')

module.exports.jobSchema = joi.object({
  dockerHost: joi.string().required(),
  hostname: joi.string().required(),
  tid: joi.string()
}).unknown().required().label('job')

module.exports.task = (job) => {
  return Docker.doesDockExist(job.dockerHost)
    .tap(function (exists) {
      if (!exists) {
        throw new WorkerStopError(
          'Dock was removed',
          { job: job }
        )
      }
    })
    .then(function () {
      // weave stores IP address as nicknames in the format "Nickname": "ip-10-4-145-68.$org-id"
      const nickname = 'ip-' + job.hostname.replace(/\./g, '-') + '.' + job.orgId
      return WeaveWrapper.rmpeerAsync(job.dockerHost, nickname)
    })
}
