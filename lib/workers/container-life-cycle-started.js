/**
 * attach network to container
 * @module lib/workers/container-life-cycle-started
 */
'use strict';

var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Events = Promise.promisifyAll(require('../models/events.js'));
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!Events.validateJob(job)) {
        throw new TaskFatalError('job id, host, or from keys');
      }
    })
    .then(function handleStarted () {
      return Events.handleStartedAsync(job);
    })
    .catch(function (err) {
      log.error({ err: err }, 'container-life-cycle-started error');
      throw err;
    });
};