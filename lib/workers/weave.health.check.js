/**
 * weave health check
 * @module lib/workers/weave.health.check
 */
'use strict'

const InvalidJob = require('error-cat/errors/invalid-job-error')
const Joi = require('joi')
const Promise = require('bluebird')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

const Docker = require('../models/docker')
const log = require('../logger.js')()
const RabbitMQ = require('../models/rabbitmq.js')

const schema = Joi.object().keys({
  containerId: Joi.string().required(),
  delay: Joi.number().integer().required()
}).label('job')

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      return Promise.try(function () {
        Joi.assert(job, schema)
      }).catch(function (err) {
        throw new InvalidJob(
          'Invalid job',
          { job: job, err: err }
        )
      })
    })
    // delay before we check logs
    .delay(job.delay)
    .then(function fetchLogs () {
      return Docker.getLogsAsync(job.containerId)
    })
    .then(function checkLogs (logs) {
      log.trace({ job: job, logs: logs }, 'weave logs')
      if (logs && logs.indexOf('netlink error response: no such device') > -1) {
        RabbitMQ.publishWeaveKill({
          containerId: job.containerId
        })
      } else {
        log.info(job, 'weave health check success')
      }
    })
    .catch(function (err) {
      log.error({ job: job, err: err }, 'weave health check error')
      if (err.statusCode === 404) {
        throw new WorkerStopError(
          'Container was not found',
          { job: job }
        )
      }
      throw err
    })
}
