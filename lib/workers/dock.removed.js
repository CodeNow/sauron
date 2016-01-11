/**
 * start weave container
 * @module lib/workers/weave-start
 */
'use strict';

var isString = require('101/is-string');
var isNumber = require('101/is-number');
var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Events = Promise.promisifyAll(require('../models/events.js'));
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.host)) {
        throw new TaskFatalError(
          'dock.removed',
          'Missing host',
          { job: job }
        );
      }
      if (!isNumber(job.githubId))) {
        throw new TaskFatalError(
          'dock.removed',
          'Missing githubId',
          { job: job }
        );
      }
    })
    .then(function startWeave () {
      return Events.handleDockRemoved(job);
    })
};
