/**
 * Docker API requests
 * @module lib/models/docker
 */
'use strict';
require('loadenv')();

var _ = require('underscore');
var Promise = require('bluebird');
var Swarmerode = require('swarmerode');
var Dockerode = require('dockerode');
Dockerode = Swarmerode(Dockerode);

var compose = require('101/compose');
var equals = require('101/equals');
var findIndex = require('101/find-index');
var ErrorCat = require('error-cat');
var fs = require('fs');
var join = require('path').join;
var miss = require('mississippi');
var pluck = require('101/pluck');
var put = require('101/put');
var url = require('url');

var log = require('../logger.js')();

var certs = {};
var error = new ErrorCat();

var Docker = {};
module.exports = Docker;

/**
 * loads certs for docker. does not throw if failed, just logs
 * sync function as this should only happen once on startup
 */
Docker.loadCerts = function () {
  // try/catch is a better pattern for this, since checking to see if it exists
  // and then reading files can lead to race conditions (unlikely, but still)
  try {
    var certPath = process.env.DOCKER_CERT_PATH;
    certs.ca = fs.readFileSync(join(certPath, '/ca.pem'));
    certs.cert = fs.readFileSync(join(certPath, '/cert.pem'));
    certs.key = fs.readFileSync(join(certPath, '/key.pem'));
    log.info('Docker.loadCerts docker certificates loaded');
  } catch (err) {
    log.fatal({ err: err }, 'Docker.loadCerts cannot load certificates for docker');
    throw err;
  }
};

/**
 * Filter docks by an org
 * @param {Array} array of all nodes/docks (parsed swarm data)
 * @param {String} orgId used to filter docks
 */
Docker._findDocksByOrgId = function (nodes, orgId) {
  return nodes.filter(function (node) {
    var labels = node.Labels || []
    var orgLabels = labels.filter(function (label) {
      return label.name === 'org' && label.value === orgId
    })
    return orgLabels.length > 0
  })
}

/**
 * Call `swarm info` and parse output in more developer friendly format
 * @return {Function} (err, [nodes])
 * @return {String} node.Host
 * @return {String} node.Status
 * @return {Number} node.Containers
 * @return {String} node.ReservedCpus
 * @return {String} node.ReservedMem
 * @return {Object} node.Labels
 * @return {String} node.Error
 * @return {String} node.UpdatedAt
 * @return {String} node.ServerVersion
 */
Docker.info = function (cb) {
  var swarmClient = new Dockerode(put({
    host: process.env.SWARM_HOSTNAME,
    port: process.env.SWARM_PORT
  }, certs))
  log.info('Docker.info')

  swarmClient.swarmInfo(function (err, infoData) {
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
  var swarmClient = new Dockerode(put({
    host: process.env.SWARM_HOSTNAME,
    port: process.env.SWARM_PORT
  }, certs));

  var logger = log.child({ dockerHost: dockerHost })
  logger.info('Docker.doesDockExist');

  swarmClient.info(function (err, infoData) {
    logger.trace({ infoData: infoData }, 'doesDockExist: info');

    if (err) {
      logger.error({ err: err }, 'doesDockExist: info error');
      return cb(err);
    }
    // format of this is really bad, it is an array of arrays of strings
    // ex: [[ 'Role', 'primary' ], ['other', 'stuff'], ['ip-10-0-0-1', '10.0.0.1:4242']]
    // the second item of one of the sub arrays should contain dockerHost format: 10.0.0.1:4242
    // look at the test for sample response
    var isInList = !!~findIndex(infoData.SystemStatus, compose(equals(dockerHost), pluck(1)))

    log.trace({ dockExists: isInList }, 'doesDockExist: dock has been removed');
    return cb(null, isInList);
  });
};

/**
 * Fethch all logs by container id. Non stream
 * @param {String} container id
 * @param {Function} cb (err, logs)
 */
Docker.getLogs = function (containerId, cb) {
  var logger = log.child({ containerId: containerId })
  logger.info('Docker.getLogs');
  var swarmClient = new Dockerode(put({
    host: process.env.SWARM_HOSTNAME,
    port: process.env.SWARM_PORT
  }, certs))
  var opts = {
    stdout: true,
    stderr: true
  }
  swarmClient.getContainer(containerId).logs(opts, function (err, stream) {
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

/**
 * Kill container by id
 * @param {String} container id
 * @param {Function} cb (err)
 */
Docker.killContainer = function (containerId, cb) {
  var logger = log.child({ containerId: containerId })
  logger.info('Docker.killContainer');
  var swarmClient = new Dockerode(put({
    host: process.env.SWARM_HOSTNAME,
    port: process.env.SWARM_PORT
  }, certs))
  swarmClient.getContainer(containerId).kill(cb)
}

Promise.promisifyAll(Docker)
