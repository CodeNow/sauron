/**
 * weave forget
 * @module lib/workers/weave.peer.forget
 */
'use strict';

var isString = require('101/is-string');
var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Docker = require('../models/docker');
var WeaveWrapper = require('../models/weave-wrapper');
var log = require('../logger.js')();

module.exports = function (job) {
  log.info(job, 'weave.peer.forget start')
  return Promise.resolve()
    .then(function validateArguments () {
      // format 10.0.0.1:4242
      if (!isString(job.dockerHost)) {
        throw new TaskFatalError(
          'weave.peer.forget',
          'Missing dockerHost',
          { job: job }
        );
      }
      if (!isString(job.hostname)) {
        throw new TaskFatalError(
          'weave.peer.forget',
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
          'weave.peer.forget',
          'Dock was removed',
          { job: job }
        );
      }
    })
    .then(function () {
      return WeaveWrapper.forgetAsync(job.dockerHost, job.hostname)
    })
};
