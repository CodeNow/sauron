/**
 * checks if the container that died is weave
 * if it is, we kill ourselves so we can reinitialize weave
 * @module lib/workers/container-life-cycle-died
 */
'use strict';

var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;
var ErrorCat = require('error-cat');
var error = new ErrorCat();

var Events = require('../models/events.js');
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
      Events.handleDied(job);
    })
    .catch(TaskFatalError, function (err) {
      log.error({ err: err }, 'container-life-cycle-died validation error');
      throw err;
    })
    .catch(WeaveDiedError, function reportDieError (err) {
      error.report(err);
      throw err;
    })
    .catch(WeaveDiedError, function (err) {
      log.fatal({ err: err }, 'weave container died');
      process.exit(1);
    });
};
