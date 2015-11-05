/**
 * Check container against mongo and if it doesn't exist, enqueue a job to
 * delete it.
 * @module lib/tasks/container/check-against-mongo
 */
'use strict';

// external
var assign = require('101/assign');
var exists = require('101/exists');
var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

// internal
var Events = require('../models/events.js');
var rabbitmqHelper = require('./rabbitmw.js');

var log = require('logger').getChild(__filename);

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!Events._validate(job)) {
        throw new TaskFatalError('job missing id or host');
      }
      if (!Events._validate(job)) {
        throw new TaskFatalError('containerId is required');
      }
    })
    .then(function handleDie () {
      return Events._handleDie(job);
    })
    .catch(function (err) {
      log.error({ err: err }, 'weave container task error');
      throw err;
    });
};