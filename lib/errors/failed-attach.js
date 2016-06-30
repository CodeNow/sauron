'use strict'

const BaseError = require('error-cat/errors/base-error')

/**
 * error for failed attachment
 * @param {Object} err          error object from weave cmd result
 * @param {String} containerId  value or argument that was invalid
 * @param {String} stdout       stdout from weave command
 */
class FailedAttach extends BaseError {
  constructor (containerId, stdout) {
    const message = `failed to attach network to ${containerId}. stdout: ${stdout}.`
    const data = {
      containerId: containerId,
      stdout: stdout
    }
    const reporting = {
      level: 'critical',
      fingerprint: 'weave-wrapper'
    }
    super(message, data, reporting)
  }
}

/**
 * Invalid Argument Error Class
 * @module sauron:error
 */
module.exports = FailedAttach
