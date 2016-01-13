/**
 * Docker API requests
 * @module lib/models/docker
 */
'use strict';
require('loadenv')('sauron:env');

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

var log = require('../logger.js')();

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
    var isInList = !!~findIndex(infoData.DriverStatus, compose(equals(dockerHost), pluck(1)))

    log.trace(put({ dockExists: isInList }, logData), 'doesDockExist: dock has been removed');
    return cb(null, isInList);
  });
};

Promise.promisifyAll(Docker)
