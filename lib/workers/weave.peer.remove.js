/**
 * weave forget
 * @module lib/workers/weave.peer.remove
 */
'use strict'

require('loadenv')()

const WorkerStopError = require('error-cat/errors/worker-stop-error')
const Swarm = require('../models/swarm')
const WeaveWrapper = require('../models/weave-wrapper')
const schemas = require('../models/schemas')

module.exports.jobSchema = schemas.weavePeerRemove

module.exports.task = (job) => {
  return Swarm.doesDockExist(job.dockerHost)
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
