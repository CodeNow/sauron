/**
 * @module lib/logger
 */
'use strict';
require('loadenv')();

var bunyan = require('bunyan');
var stack = require('callsite');

var logger = bunyan.createLogger({
  name: process.env.APP_NAME,
  streams: [{
    level: process.env.LOG_LEVEL_STDOUT,
    stream: process.stdout
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
