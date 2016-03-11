/**
 * Docker API requests
 * @module lib/models/docker
 */
'use strict';
require('loadenv')();

var _ = require('underscore')
var Promise = require('bluebird');
var Dockerode = require('dockerode');
var compose = require('101/compose');
var equals = require('101/equals');
var findIndex = require('101/find-index');
var ErrorCat = require('error-cat');
var fs = require('fs');
var join = require('path').join;
var pluck = require('101/pluck');
var put = require('101/put');
var url = require('url');

var log = require('../logger.js')()

var certs = {};
var error = new ErrorCat();

var Docker = {}
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
 * Parse and transform raw swarm data into the proper JSON.
 * ex: [[ 'Role', 'primary' ], ['other', 'stuff'], ['ip-10-0-0-1', '10.0.0.1:4242']]
 * becomes {'Role': 'primary', 'other': 'stuff'}
 * @param {Array} - array data response from swarm info
 * @return array of json objects with swarm data for each node
 */
Docker._parseSwarmInfo = function (infoData) {
  // format of this is really bad, it is an array of arrays of strings
  // ex: [[ 'Role', 'primary' ], ['other', 'stuff'], ['ip-10-0-0-1', '10.0.0.1:4242']]
  // the second item of one of the sub arrays should contain dockerHost format: 10.0.0.1:4242
  // look at the test for sample response
  var swarmRawData = infoData.SystemStatus
  var nodes = swarmRawData.reduce(function (prevVal, currVal) {
    // [ 'Role', 'primary' ] -> `Role`
    // ' └ Labels' -> Labels
    // ' ? Labels' -> Labels
    var propName = currVal[0].replace(/^\W*/, '').trim()
    var propVal = currVal[1]
    if (propName.indexOf('ip') === 0) {
      var newNode = {}
      newNode['dockerHost'] = propVal
      prevVal.push(newNode)
    }
    if (prevVal.length === 0) {
      return prevVal
    }
    var lastNode = prevVal[prevVal.length - 1]
    if (propName.indexOf('Labels') >= 0) {
      var labelsTokens = propVal.split(',')
      var labels = labelsTokens.map(function (labelToken) {
        var pair = labelToken.split('=').map(function (s) {
          return s.trim()
        })
        return { name: pair[0], value: pair[1]}
      })
      lastNode[propName] = labels
    } else if (propName.indexOf('Containers') >= 0) {
      lastNode[propName] = parseInt(propVal, 10)
    } else {
      lastNode[propName] = propVal
    }
    return prevVal
  }, [])
  return nodes
}

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
 * @return {String} node.dockerhost
 * @return {String} node['ip-<ipAddr>'']
 * @return {String} node.Status
 * @return {Number} node.Containers
 * @return {String} node['Reserved CPUs']
 * @return {String} node['Reserved Memory']
 * @return {Object} node.Labels
 */
Docker.info = function (cb) {
  var swarmClient = new Dockerode(put({
    host: process.env.SWARM_HOSTNAME,
    port: process.env.SWARM_PORT
  }, certs))
  log.info('Docker.info')

  swarmClient.info(function (err, infoData) {
    log.trace({ infoData: infoData }, 'info: info');

    if (err) {
      log.error({ err: err }, 'info: info error');
      return cb(err);
    }
    var nodes = Docker._parseSwarmInfo(infoData)
    log.info({ nodes: nodes }, 'Docker.info parsed')
    cb(null, nodes)
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
  var logData = {
    orgId: orgId
  }
  log.info(logData, 'Docker.findDocksByOrgId')
  Docker.info(function (err, docks) {
    if (err) { return cb(err) }
    var orgDocks = Docker._findDocksByOrgId(docks, orgId)
    log.trace(put({ docks: orgDocks }, logData), 'findDocksByOrgId swarm info')
    cb(null, orgDocks)
  })
}

/**
 * Find the dock that belongs to the org and has minimum amount of containers
 * @param {String} orgId to find the lightest dock
 * @return {Function} standard callback
 */
Docker.findLightestOrgDock = function (orgId, cb) {
  var logData = {
    orgId: orgId
  }
  log.info(logData, 'Docker.findLightestOrgDock')
  Docker.findDocksByOrgId(orgId, function (err, docks) {
    if (err) { return cb(err) }

    var sortedDocks = _.sortBy(docks, 'Containers')
    if (sortedDocks.length === 0) {
      return cb(null, null)
    }
    var lightestDock = sortedDocks[0]
    log.trace(put({ dock: lightestDock }, logData), 'findLightestOrgDock found')
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

  var logData = {
    dockerHost: dockerHost
  };
  log.info(logData, 'Docker.doesDockExist');

  swarmClient.info(function (err, infoData) {
    log.trace(put({
      infoData: infoData
    }, logData), 'doesDockExist: info');

    if (err) {
      log.error(put({
        err: err,
      }, logData), 'doesDockExist: info error');
      return cb(err);
    }
    // format of this is really bad, it is an array of arrays of strings
    // ex: [[ 'Role', 'primary' ], ['other', 'stuff'], ['ip-10-0-0-1', '10.0.0.1:4242']]
    // the second item of one of the sub arrays should contain dockerHost format: 10.0.0.1:4242
    // look at the test for sample response
    var isInList = !!~findIndex(infoData.SystemStatus, compose(equals(dockerHost), pluck(1)))

    log.trace(put({ dockExists: isInList }, logData), 'doesDockExist: dock has been removed');
    return cb(null, isInList);
  });
};

Promise.promisifyAll(Docker)
