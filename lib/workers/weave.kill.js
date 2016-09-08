/**
 * weave kill
 * @module lib/workers/weave.kill
 */
'use strict'
require('loadenv')()

const joi = require('joi')
const Swarm = require('@runnable/loki').Swarm
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const log = require('../logger.js')()

module.exports.jobSchema = joi.object({
  containerId: joi.string().required(),
  tid: joi.string()
}).unknown().required().label('job')

module.exports.task = (job) => {
  const swarmHost = 'https://' + process.env.SWARM_HOSTNAME + ':' + process.env.SWARM_PORT
  const swarmClient = new Swarm({
    host: swarmHost,
    log: log
  })
  return swarmClient.killContainerAsync(job.containerId)
    .catch(function (err) {
      log.error({ err: err }, 'weave kill error')
      if (err.statusCode === 404) {
        throw new WorkerStopError(
          'Container was not found',
          { job: job }
        )
      }
      throw err
    })
}
