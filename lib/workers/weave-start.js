/**
 * start weave container
 * @module lib/workers/weave-start
 */
'use strict';

var Promise = require('bluebird');

var WeaveSetup = require('../models/weave-setup.js');
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function startWeave () {
      return WeaveSetup.setup(job);
    })
    .catch(function (err) {
      log.error({ err: err }, 'weave.start error');
      throw err;
    });
};
