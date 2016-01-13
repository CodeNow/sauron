/**
 * weave forget
 * @module lib/workers/weave.forget
 */
'use strict';

var isString = require('101/is-string');
var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Docker = require('../models/docker');
var WeaveWrapper = require('../models/weave-wrapper');
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.dockerHost)) {
        throw new TaskFatalError(
          'weave.forget',
          'Missing dockerHost',
          { job: job }
        );
      }
      if (!isString(job.hostname)) {
        throw new TaskFatalError(
          'weave.forget',
          'Missing hostname to delete',
          { job: job }
        );
      }
    })
    .then(function checkDock () {
      return Docker.doesDockExistAsync(job.dockerHost)
    })
    .then(function (exists) {
      if (!exists) {
        throw new TaskFatalError(
          'weave.forget',
          'Dock was removed',
          { job: job }
        );
      }
    })
    .then(function () {
      return WeaveWrapper.forgetAsync(job.dockerHost, job.hostname)
    })
};
