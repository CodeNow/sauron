/**
 * Check if died container is weave, kill self if so
 * @module lib/workers/container-life-cycle-died
 */
'use strict';

var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Events = Promise.promisifyAll(require('../models/events.js'));
var log = require('../logger.js')();
var WeaveDiedError = require('../errors/weave-died-error.js');

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!Events.validateJob(job)) {
        throw new TaskFatalError('job id, host, or from keys');
      }
    })
    .then(function handleDied () {
      return Events.handleDiedAsync(job);
    })
    .catch(TaskFatalError, function (err) {
      log.error({ err: err }, 'container-life-cycle-died validation error');
      throw err;
    })
    .catch(WeaveDiedError, function (err) {
      log.error({ err: err }, 'weave container died');
      process.exit(1);
    });
};