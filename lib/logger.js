/**
 * @module lib/logger
 */
'use strict';
require('loadenv')();

var bunyan = require('bunyan')
var path = require('path')

/**
 * Logger Generator
 * @class
 * @module sauron:logger
 * @return {object} Logger
 */
var logger = module.exports = bunyan.createLogger({
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

/**
 * Initiate and return child instance.
 * @param {string} moduleName Module name to include in logger.
 * @returns {object} Logger
 */
module.exports.getChild = function (moduleName) {
  moduleName = path.relative(process.cwd(), moduleName)
  return logger.child({ module: moduleName }, true)
}
