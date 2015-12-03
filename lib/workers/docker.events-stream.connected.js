/**
 * launch weave on new hosts
 * @module lib/workers/docker.events-stream.connected
 */
'use strict';

var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Events = require('../models/events.js');
var RabbitMQ = require('../models/rabbitmq.js');
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!Events.validateDockerJob(job)) {
        throw new TaskFatalError('job missing host or tags key');
      }
    })
    .then(function handleStart () {
      RabbitMQ.publishWeaveStart({
        dockerUri: job.host,
        orgId: job.tags.split(',')[0]
      });
    })
    .catch(function (err) {
      log.error({ err: err }, 'docker.events-stream.connected error');
      throw err;
    });
};