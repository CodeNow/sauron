/**
 * checks if the container that died is weave
 * if it is, create a start weave container job
 * @module lib/workers/container-life-cycle-died
 */
'use strict'

var Promise = require('bluebird')
var TaskFatalError = require('ponos').TaskFatalError

var Events = require('../models/events.js')
var log = require('../logger.js')()

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!Events.validateContainerJob(job)) {
        throw new TaskFatalError(
          'container.life-cycle.died',
          'Job id, host, tags, or from keys',
          { job: job }
        )
      }
    })
    .then(function handleDied () {
      Events.handleDied(job)
    })
}
