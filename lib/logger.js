/**
 * @module lib/logger
 */
'use strict'
require('loadenv')()

var bunyan = require('bunyan')
var getNamespace = require('continuation-local-storage').getNamespace
var put = require('101/put')
var stack = require('callsite')

var serializers = put(bunyan.stdSerializers, {
  tx: function () {
    var tid
    try {
      var session = getNamespace('ponos')
      tid = session.get('tid')
    } catch (e) {
      // cant do anything here
    }
    return {
      tid: tid
    }
  }
})

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
  serializers: serializers,
  src: false,
  // default values included in all log objects
  commit: process.env.npm_package_gitHead,
  environment: process.env.NODE_ENV
})

/**
 * Initiate and return child instance.
 * @returns {object} Logger
 */
module.exports = function () {
  return logger.child({ tx: true, module: stack()[1].getFileName() })
}
