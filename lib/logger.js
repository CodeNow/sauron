/**
 * @module lib/logger
 */
'use strict'
require('loadenv')()

const bunyan = require('bunyan')
const getNamespace = require('continuation-local-storage').getNamespace
const put = require('101/put')
const stack = require('callsite')

const serializers = put(bunyan.stdSerializers, {
  tx: function () {
    let out
    try {
      out = {
        tid: getNamespace('ponos').get('tid')
      }
    } catch (e) {
      // cant do anything here
    }
    return out
  }
})

/**
 * Logger Generator
 * @class
 * @module sauron:logger
 * @return {object} Logger
 */
const logger = bunyan.createLogger({
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
