/**
 * weave forget
 * @module lib/workers/weave.forget
 */
'use strict';

var isString = require('101/is-string');
var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var WeaveWrapper = require('../models/weave-wrapper.js');
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
      if (!isString(job.host)) {
        throw new TaskFatalError(
          'weave.forget',
          'Missing host to delete',
          { job: job }
        );
      }
    })
    .then(function () {
      return WeaveWrapper.forgetAsync(job.dockerHost, job.host)
    })
};
