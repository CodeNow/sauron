/**
 * weave forget
 * @module lib/workers/weave.forget
 */
'use strict';

var isString = require('101/is-string');
var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var WeaveWrapper = Promise.promisifyAll(require('../models/weave-wrapper.js'));
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.dockerUri)) {
        throw new TaskFatalError(
          'weave.forget',
          'Missing dockerUri',
          { job: job }
        );
      }
      if (!isString(job.host)) {
        throw new TaskFatalError(
          'weave.forget',
          'Missing orgId',
          { job: job }
        );
      }
    })
    .then(WeaveWrapper.forgetAsync.bind(WeaveWrapper, job.dockerUri, job.host))
};
