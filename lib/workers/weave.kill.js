/**
 * weave kill
 * @module lib/workers/weave.kill
 */
'use strict'

const InvalidJob = require('error-cat/errors/invalid-job-error')
const isString = require('101/is-string')
const Promise = require('bluebird')
const Swarm = require('@runnable/loki').Swarm
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const log = require('../logger.js')()

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.containerId)) {
        throw new InvalidJob(
          'Missing containerId',
          { job: job }
        )
      }
    })
    .then(function killContainer () {
      const swarmHost = 'https://' + process.env.SWARM_HOSTNAME + ':' + process.env.SWARM_PORT
      const swarmClient = new Swarm({
        host: swarmHost,
        log: log
      })
      return swarmClient.killContainerAsync(job.containerId)
    })
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
