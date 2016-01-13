/**
 * weave forget
 * @module lib/workers/weave.peer.remove
 */
'use strict';

var isString = require('101/is-string');
var find = require('101/find');
var hasProps = require('101/has-properties');
var keypather = require('keypather')()
var put = require('101/put');

var Promise = require('bluebird');
var TaskFatalError = require('ponos').TaskFatalError;

var Docker = require('../models/docker');
var WeaveWrapper = require('../models/weave-wrapper');
var log = require('../logger.js')();

module.exports = function (job) {
  return Promise.resolve()
    .then(function validateArguments () {
      if (!isString(job.dockerHost)) {
        throw new TaskFatalError(
          'weave.peer.remove',
          'Missing dockerHost',
          { job: job }
        );
      }
      if (!isString(job.hostname)) {
        throw new TaskFatalError(
          'weave.peer.remove',
          'Missing hostname',
          { job: job }
        );
      }
    })
    .then(function checkDock () {
      return Docker.doesDockExistAsync(job.dockerHost)
    })
    .then(function (exists) {
      if (!exists) {
        throw new TaskFatalError(
          'weave.peer.remove',
          'Dock was removed',
          { job: job }
        );
      }
    })
    .then(function () {
      log.trace(job, 'weave report')
      // weave stores IP address as nicknames in the format "Nickname": "ip-10-4-145-68"
      var nickname = 'ip-' + job.hostname.replace(/\./g, '-')
      return WeaveWrapper.reportAsync(job.dockerHost)
        .then(function (report) {
          var peers = keypather.get(report, 'IPAM.Entries')

          var peer = find(peers, hasProps({ 'Nickname': nickname }))
          if (!peer) {
            var exitError = new TaskFatalError(
              'weave.forget',
              'Missing host',
              { job: job })
            exitError.report = false
            throw exitError
          }
          return peer.Peer
        })
    })
    .then(function (peerId) {
      log.trace(put({ peerId: peerId }, job), 'weave rmpeer')
      return WeaveWrapper.rmpeerAsync(job.dockerHost, peerId)
    })
};
