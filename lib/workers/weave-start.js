/**
 * start weave container
 * @module lib/workers/weave-start
 */
'use strict'

var isString = require('101/is-string')
var Promise = require('bluebird')
var TaskFatalError = require('ponos').TaskFatalError

var Events = require('../models/events.js')

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.dockerUri)) {
        throw new TaskFatalError(
          'weave.start',
          'Missing dockerUri',
          { job: job }
        )
      }
      if (!isString(job.orgId)) {
        throw new TaskFatalError(
          'weave.start',
          'Missing orgId',
          { job: job }
        )
      }
    })
    .then(function startWeave () {
      return Events.handleStartAsync(job)
    })
}
