/**
 * attach network to container
 * @module lib/workers/container-life-cycle-started
 */
'use strict';

var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Events = require('../models/events.js');
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!Events.validateContainerJob(job)) {
        throw new TaskFatalError(
          'container.life-cycle.started',
          'Job id, host, or from keys',
          { job: job }
        );
      }
    })
    .then(function handleStarted () {
      return Events.handleStartedAsync(job);
    })
};
