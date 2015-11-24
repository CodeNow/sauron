/**
 * start weave container
 * @module lib/workers/weave-start
 */
'use strict';

var isString = require('101/is-string');
var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Events = Promise.promisifyAll(require('../models/events.js'));
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.dockerUri)) {
        throw new TaskFatalError('missing dockerUri');
      }
      if (!isString(job.orgId)) {
        throw new TaskFatalError('missing orgId');
      }
    })
    .then(function startWeave () {
      return Events.handleStartAsync(job);
    })
    .catch(function (err) {
      log.error({ err: err }, 'weave.start error');
      throw err;
    });
};
