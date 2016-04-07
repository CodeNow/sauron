/**
 * weave health check
 * @module lib/workers/weave.health.check
 */
'use strict';

var isString = require('101/is-string');
var Promise = require('bluebird');
var RabbitMQ = require('./rabbitmq.js');
var TaskFatalError = require('ponos').TaskFatalError;

var Docker = require('../models/docker');

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.containerId)) {
        throw new TaskFatalError(
          'weave.health.check',
          'Missing containerId',
          { job: job }
        );
      }
    })
    // delay before we check logs
    .delay(process.env.WEAVE_HEALTH_CHECK_DELAY)
    .then(function fetchLogs () {
      return Docker.getLogsAsync(job.containerId)
    })
    .then(function checkLogs (logs) {
      if (logs && logs.indexOf('netlink error response: no such device') > -1) {
        RabbitMQ.publishWeaveKill(job.containerId)
      }
    })
    .catch(function (err) {
      if (err.statusCode === 404) {
        throw new TaskFatalError(
          'weave.kill',
          'Container was not found',
          { job: job }
        );
      }
      throw err
    })
};