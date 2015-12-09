'use strict';
var Promise = require('bluebird');

var Peers = require('./models/peers.js');
var RabbitMQ = require('./models/rabbitmq.js');
var WorkerServer = require('./models/worker-server.js');

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
  return Promise.resolve()
    .then(function () {
      RabbitMQ.create();
      return Promise.promisify(WorkerServer.listen, { context: WorkerServer })();
    })
    .then(function () {
      // Empty string returns all docks
      return Promise.promisify(Peers.getList, { context: Peers })('');
    })
    .then(function (docks) {
      docks.forEach(function (dockData) {
        RabbitMQ.publishWeaveStart(dockData);
      });
    })
    .asCallback(cb);
};

/**
 * started listening for weave container deaths
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
    .asCallback(cb);
};
