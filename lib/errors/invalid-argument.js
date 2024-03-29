'use strict'

const BaseError = require('error-cat/errors/base-error')

/**
 * Invalid Argument Error Class
 * error for invalid arguments
 * @param {Any}    argValue  value or argument that was invalid
 * @param {String} argName   name of argument
 * @param {String} expected  what this value should be
 */
module.exports = class InvalidArgumentError extends BaseError {
  constructor (argValue, argName, expected) {
    const message = `expected ${argName} to be a/an ${expected}. Got ${argValue}`
    const data = {
      argName: argName,
      expected: expected,
      actual: argValue
    }
    const reporting = {
      level: 'error',      // the reporting level
      fingerprint: 'invalid-argument'  // a grouping fingerprint
    }
    super(message, data, reporting)
  }
}
