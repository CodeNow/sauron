/**
 * Docker API requests
 * @module lib/models/docker
 */
'use strict'
require('loadenv')()

const _ = require('underscore')
const Promise = require('bluebird')
const keypather = require('keypather')()
const Swarm = require('@runnable/loki').Swarm

const log = require('../logger.js')()

const Docker = {}
module.exports = Docker

function swarmHost () {
  return 'https://' + process.env.SWARM_HOSTNAME + ':' + process.env.SWARM_PORT
}

function newSwarmClient (orgGitHubId) {
  const tags = {}
  if (orgGitHubId) {
    tags.orgGitHubId = orgGitHubId
  }
  const swarmClient = new Swarm({
    host: swarmHost(),
    log: log,
    datadogTags: tags
  })
  return swarmClient
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
 * @return {String} optional github org id
 * @return {Promise} [nodes]
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
Docker.info = function (orgGitHubId, cb) {
  const logger = log.child({
    method: 'info'
  })
  logger.info('call')

  const swarmClient = newSwarmClient(orgGitHubId)

  return swarmClient.swarmInfoAsync()
  .then((infoData) => {
    const parsedNodes = Object.keys(infoData.parsedSystemStatus.ParsedNodes)
      .map(function (key) {
        return infoData.parsedSystemStatus.ParsedNodes[key]
      })
    logger.trace({ parsedNodesCount: parsedNodes.length }, 'nodes')
    return parsedNodes
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
  const logger = log.child({
    orgId: orgId,
    method: 'findDocksByOrgId'
  })
  logger.info('call')
  Docker.info(orgId).asCallback(function (err, docks) {
    if (err) { return cb(err) }
    const orgDocks = Docker._findDocksByOrgId(docks, orgId)
    logger.trace({ docks: orgDocks }, 'results')
    cb(null, orgDocks)
  })
}

/**
 * Find the dock that belongs to the org and has minimum amount of containers
 * @param {String} orgId to find the lightest dock
 * @return {Function} standard callback
 */
Docker.findLightestOrgDock = function (orgId, cb) {
  const logger = log.child({
    orgId: orgId,
    method: 'findLightestOrgDock'
  })
  logger.info('call')
  Docker.findDocksByOrgId(orgId, function (err, docks) {
    if (err) { return cb(err) }
    const sortedDocks = _.sortBy(docks, 'Containers')
    if (sortedDocks.length === 0) {
      return cb(null, null)
    }
    const lightestDock = sortedDocks[0]
    log.trace({ dock: lightestDock }, 'found')
    cb(null, lightestDock)
  })
}

/**
 * checks swarm to see if dock still in rotation.
 * @param {String} dockerHost docker host to check for format: 10.0.0.1:4242
 */
Docker.doesDockExist = function (dockerHost) {
  const logger = log.child({
    dockerHost: dockerHost,
    method: 'doesDockExist'
  })
  logger.info('call')
  const swarmClient = newSwarmClient(orgGitHubId)
  return swarmClient.swarmHostExistsAsync(dockerHost)
}

Promise.promisifyAll(Docker)
