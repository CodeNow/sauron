/**
 * checks if the container that died is weave
 * if it is, we kill ourselves so we can reinitialize weave
 * @module lib/workers/container-life-cycle-died
 */
'use strict';

var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Events = require('../models/events.js');
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!Events.validateJob(job)) {
        throw new TaskFatalError('job id, host, or from keys');
      }
    })
    .then(function handleDied () {
      Events.handleDied(job);
    })
    .catch(function (err) {
      log.error({ err: err }, 'container-life-cycle-died error');
      throw err;
    });
};
