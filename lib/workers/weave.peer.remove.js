/**
 * weave forget
 * @module lib/workers/weave.peer.remove
 */
'use strict'

var isString = require('101/is-string')

var Promise = require('bluebird')
var TaskFatalError = require('ponos').TaskFatalError

var Docker = require('../models/docker')
var WeaveWrapper = require('../models/weave-wrapper')

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.dockerHost)) {
        throw new TaskFatalError(
          'weave.peer.remove',
          'Missing dockerHost',
          { job: job }
        )
      }
      if (!isString(job.hostname)) {
        throw new TaskFatalError(
          'weave.peer.remove',
          'Missing hostname',
          { job: job }
        )
      }
      if (!isString(job.orgId)) {
        throw new TaskFatalError(
          'weave.peer.remove',
          'Missing orgId',
          { job: job }
        )
      }
    })
    .then(function checkDock () {
      return Docker.doesDockExist(job.dockerHost)
    })
    .then(function (exists) {
      if (!exists) {
        throw new TaskFatalError(
          'weave.peer.remove',
          'Dock was removed',
          { job: job }
        )
      }
    })
    .then(function () {
      // weave stores IP address as nicknames in the format "Nickname": "ip-10-4-145-68.$org-id"
      var nickname = 'ip-' + job.hostname.replace(/\./g, '-') + '.' + job.orgId
      return WeaveWrapper.rmpeerAsync(job.dockerHost, nickname)
    })
}
