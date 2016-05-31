/**
 * Docker API requests
 * @module lib/models/docker
 */
'use strict';
require('loadenv')();

var _ = require('underscore');
var Promise = require('bluebird');
var keypather = require('keypather')();
const Swarm = require('@runnable/loki').Swarm

var compose = require('101/compose');
var equals = require('101/equals');
var ErrorCat = require('error-cat');
var join = require('path').join;
var miss = require('mississippi');
var pluck = require('101/pluck');
var put = require('101/put');
var url = require('url');

var log = require('../logger.js')();

var error = new ErrorCat();

var Docker = {};
module.exports = Docker;


function swarmHost () {
  return 'https://' + process.env.SWARM_HOSTNAME + ':' + process.env.SWARM_PORT
}

/**
 * Filter docks by an org
 * @param {Array} array of all nodes/docks (parsed swarm data)
 * @param {String} orgId used to filter docks
 */
Docker._findDocksByOrgId = function (nodes, orgId) {
  return nodes.filter(function (node) {
    return keypather.get(node, 'Labels.org') === orgId
  })
}

/**
 * Call `swarm info` and parse output in more developer friendly format
 * @return {Function} (err, [nodes])
 * @return {String} node.Host - '10.4.138.31:4242'
 * @return {String} node.Status - 'Healthy'
 * @return {Number} node.Containers - 20
 * @return {String} node.ReservedCpus - '0 / 2'
 * @return {String} node.ReservedMem - '3.815 GiB / 8.187 GiB'
 * @return {Object} node.Labels
 * @return {String} node.Labels.org - '9487339'
 * @return {String} node.Error - '(none)'
 * @return {String} node.UpdatedAt - '2016-04-20T21:43:49Z'
 * @return {String} node.ServerVersion - '1.10.2'
 */
Docker.info = function (cb) {
  var swarmClient = new Swarm({
    host: swarmHost(),
    log: log
  })
  log.info('Docker.info')

  swarmClient.swarmInfoAsync().asCallback(function (err, infoData) {
    if (err) {
      log.error({ err: err }, 'info: info error')
      return cb(err)
    }
    var parsedNodes = Object.keys(infoData.parsedSystemStatus.ParsedNodes)
      .map(function (key) {
        return infoData.parsedSystemStatus.ParsedNodes[key]
      })
    log.trace({ parsedNodes: parsedNodes }, 'info: info');
    cb(null, parsedNodes)
  })
}

/**
 * Find all docks that belongs to the org
 * @param {String} orgId to find the docks for
 * @return {Function} (err, [docks])
 * @return {String} dock.dockerhost
 * @return {String} dock['ip-<ipAddr>'']
 * @return {String} dock.Status
 * @return {Number} dock.Containers
 * @return {String} dock['Reserved CPUs']
 * @return {String} dock['Reserved Memory']
 * @return {Object} dock.Labels
 */
Docker.findDocksByOrgId = function (orgId, cb) {
  var logger = log.child({ orgId: orgId })
  logger.info('Docker.findDocksByOrgId')
  Docker.info(function (err, docks) {
    if (err) { return cb(err) }
    var orgDocks = Docker._findDocksByOrgId(docks, orgId)
    logger.trace({ docks: orgDocks }, 'findDocksByOrgId swarm info')
    cb(null, orgDocks)
  })
}

/**
 * Find the dock that belongs to the org and has minimum amount of containers
 * @param {String} orgId to find the lightest dock
 * @return {Function} standard callback
 */
Docker.findLightestOrgDock = function (orgId, cb) {
  var logger = log.child({ orgId: orgId })
  logger.info('Docker.findLightestOrgDock')
  Docker.findDocksByOrgId(orgId, function (err, docks) {
    if (err) { return cb(err) }

    var sortedDocks = _.sortBy(docks, 'Containers')
    if (sortedDocks.length === 0) {
      return cb(null, null)
    }
    var lightestDock = sortedDocks[0]
    log.trace({ dock: lightestDock }, 'findLightestOrgDock found')
    cb(null, lightestDock)
  })
}

/**
 * checks swarm to see if dock still in rotation.
 * will cb with error if dock still in rotation
 * @param {String} dockerHost docker host to check for format: 10.0.0.1:4242
 * @param {Function} cb (err)
 */
Docker.doesDockExist = function (dockerHost, cb) {
  var logger = log.child({ dockerHost: dockerHost, method: 'doesDockExist' })
  logger.info('call')
  var swarmClient = new Swarm({
    host: swarmHost(),
    log: log
  })
  swarmClient.swarmHostExistsAsync(dockerHost).asCallback(function (err, exists) {
    if (err) {
      logger.error({ err: err }, 'error')
      return cb(err)
    }
    logger.trace({ exists: exists }, 'dock has been removed?')
    return cb(null, exists)
  })
}

/**
 * Fethch all logs by container id. Non stream
 * @param {String} container id
 * @param {Function} cb (err, logs)
 */
Docker.getLogs = function (containerId, cb) {
  var logger = log.child({ containerId: containerId })
  logger.info('Docker.getLogs');
  var swarmClient = new Swarm({
    host: swarmHost(),
    log: log
  })
  var opts = {
    stdout: true,
    stderr: true
  }
  swarmClient.logContainerAsync(containerId, opts).asCallback(function (err, stream) {
    if (err) {
      logger.error({ err: err }, 'Docker.getLogs error')
      return cb(err)
    }
    var concatStream = miss.concat(function (logs) {
      // logs is buffer. we need to string it
      var logsStr = logs.toString()
      return cb(null, logsStr)
    })
    stream.on('error', function (streamError) {
      logger.error({ err: streamError }, 'Docker.getLogs stream error')
      cb(streamError)
    })
    stream.pipe(concatStream)
  })
}

Promise.promisifyAll(Docker)
