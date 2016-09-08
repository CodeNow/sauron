'use strict'

const BaseError = require('error-cat/errors/base-error')

/**
 * Base error for weave errors
 * @param {Object} err      error object from exec result
 * @param {String} stdout   stdout from weave command
 * @param {String} stderr   stderr from weave command
 * @param {String} command  command run
 * @param {Object} extra    additional data to add to error
 */
module.exports = class WeaveError extends BaseError {
  constructor (err, stdout, stderr, command, extra) {
    const message = `command ${command} created error: ${err.message}`
    const data = {
      err: err,
      stdout: stdout,
      stderr: stderr,
      extra: extra,
      command: command
    }
    const reporting = {
      level: 'trace',
      fingerprint: 'weave-command'
    }
    super(message, data, reporting)
  }

  containerNotRunning () {
    return /not running/i.test(this.message)
  }

  containerDied () {
    return /died/i.test(this.message)
  }

  noSuchContainer () {
    return /no such container/i.test(this.message)
  }

  outOfMemory () {
    return /cannot allocate memory/i.test(this.message)
  }

  weaveAlreadyRunning () {
    return /already running/i.test(this.message) ||
      /Found another version of weave running/i.test(this.message)
  }

  /**
   * checks to see if we can ignore this error
   * @return {Boolean}     true if we can ignore, else false
   */
  isIgnorable () {
    return this.containerNotRunning() ||
      this.containerDied() ||
      this.noSuchContainer()
  }
}
