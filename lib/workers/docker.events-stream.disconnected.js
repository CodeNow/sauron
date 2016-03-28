/**
 * handle docker.events-stream.disconnected
 * @module lib/workers/docker.events-stream.disconnected
 */
'use strict';

var isString = require('101/is-string');
var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Events = require('../models/events.js');

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.host)) {
        throw new TaskFatalError(
          'docker.events-stream.disconnected',
          'Missing host',
          { job: job }
        );
      }
      if (!isString(job.org)) {
        throw new TaskFatalError(
          'docker.events-stream.disconnected',
          'Missing githubId',
          { job: job }
        );
      }
    })
    .then(function () {
      return Events.handleDockerEventStreamDisconnectedAsync(job)
    })
};
