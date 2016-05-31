/**
 * weave kill
 * @module lib/workers/weave.kill
 */
'use strict'

var isString = require('101/is-string')
var Promise = require('bluebird')
var TaskFatalError = require('ponos').TaskFatalError
var log = require('../logger.js')()
const Swarm = require('@runnable/loki').Swarm

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.containerId)) {
        throw new TaskFatalError(
          'weave.kill',
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
        throw new TaskFatalError(
          'weave.kill',
          'Container was not found',
          { job: job }
        )
      }
      throw err
    })
}
