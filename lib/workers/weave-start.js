/**
 * start weave container
 * @module lib/workers/weave-start
 */
'use strict';

var Promise = require('bluebird');
var isString = require('101/isString');
var WeaveSetup = require('../models/weave-setup.js');
var TaskFatalError = require('ponos').TaskFatalError;
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.dockerHost)) {
        throw new TaskFatalError('missing dockerHost');
      }
    })
    .then(function startWeave () {
      return WeaveSetup.setup(job);
    })
    .catch(function (err) {
      log.error({ err: err }, 'weave.start error');
      throw err;
    });
};
