/**
 * @module lib/logger
 */
'use strict';
require('loadenv')();

var bunyan = require('bunyan');
var Bunyan2Loggly = require('bunyan-loggly').Bunyan2Loggly;
var stack = require('callsite');

var logger = bunyan.createLogger({
  name: 'navi',
  streams: [{
    level: process.env.LOG_LEVEL_STDOUT,
    stream: process.stdout
  }, {
    level: 'trace',
    stream: new Bunyan2Loggly({
      token: process.env.LOGGLY_TOKEN,
      subdomain: 'sandboxes'
    }, process.env.BUNYAN_BATCH_LOG_COUNT),
    type: 'raw'
  }],
  serializers: bunyan.stdSerializers,
  // DO NOT use src in prod, slow
  src: !!process.env.LOG_SRC,
  // default values included in all log objects
  commit: process.env.npm_package_gitHead,
  environment: process.env.NODE_ENV
});

module.exports = function () {
  return logger.child({
    module: stack()[1].getFileName()
  }, true);
};
