/**
 * weave health check
 * @module lib/workers/weave.health.check
 */
'use strict'

var isString = require('101/is-string')
var Promise = require('bluebird')
var RabbitMQ = require('../models/rabbitmq.js')
var TaskFatalError = require('ponos').TaskFatalError

var Docker = require('../models/docker')
var log = require('../logger.js')()

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.containerId)) {
        throw new TaskFatalError(
          'weave.health.check',
          'Missing containerId',
          { job: job }
        )
      }
      // TODO joi validation!
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
        log.info(job,'weave health check success')
      }
    })
    .catch(function (err) {
      log.error({ job: job, err: err }, 'weave health check error')
      if (err.statusCode === 404) {
        throw new TaskFatalError(
          'weave.health.check',
          'Container was not found',
          { job: job }
        )
      }
      throw err
    })
}
