'use strict';
var Promise = require('bluebird');
var find = require('101/find');
var hasKeypaths = require('101/has-keypaths');

var Docker = require('./models/docker.js');
var RabbitMQ = require('./models/rabbitmq.js');
var WorkerServer = require('./models/worker-server.js');
var log = require('./logger.js').getChild(__filename)

module.exports = Start;

/**
 * in charge of starting the application
 */
function Start () { }

/**
 * Start listening for weave container deaths
 * @param  {Function} cb {err}
 * @returns {Promise}
 */
Start.startup = function (cb) {
  Docker.loadCerts()
  return Promise.resolve()
    .then(function () {
      RabbitMQ.create();
      return Promise.promisify(WorkerServer.listen, { context: WorkerServer })();
    })
    .then(function () {
      // Empty string returns all docks
      return Docker.infoAsync();
    })
    .then(function (docks) {
      docks.forEach(function (dockData) {
        RabbitMQ.publishWeaveStart({
          dockerUri: 'http://' + dockData.dockerHost,
          orgId: find(dockData.Labels, hasKeypaths({ name: 'org' })).value
        });
      });
    })
    .catch(function (err) {
      log.error({ err: err }, 'Start.startup');
      throw err;
    })
    .asCallback(cb);
};

/**
 * Stop listening for weave container deaths
 * @param  {Function} cb {err}
 * @returns {Promise}
 */
Start.shutdown = function (cb) {
  return Promise.resolve()
    .then(function () {
      return Promise.promisify(WorkerServer.stop, { context: WorkerServer })();
    })
    .then(function () {
      return Promise.promisify(RabbitMQ.disconnectPublisher, { context: RabbitMQ })();
    })
    .catch(function (err) {
      log.error({ err: err }, 'Start.startup');
      throw err;
    })
    .asCallback(cb);
};
