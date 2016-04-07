/**
 * weave kill
 * @module lib/workers/weave.kill
 */
'use strict'

var isString = require('101/is-string')
var Promise = require('bluebird')
var TaskFatalError = require('ponos').TaskFatalError

var Docker = require('../models/docker')

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
      return Docker.killContainerAsync(job.containerId)
    })
    .catch(function (err) {
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
