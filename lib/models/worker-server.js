'use strict';

var ponos = require('ponos');

var log = require('../logger.js')();
var RabbitMQ = require('./rabbitmq.js');

module.exports = WorkerServer;

/**
 * Module used to listen for and handle runnable events
 */
function WorkerServer () { }

/**
 * ponos worker server
 * @type {Object}
 */
WorkerServer._server = null;

/**
 * setup ponos server with tasks
 * @param  {Function} cb (err)
 */
WorkerServer.listen = function (cb) {
  log.info('listen');

  var tasks = {
    'container.life-cycle.died': require('../workers/container-life-cycle-died.js'),
    'container.life-cycle.started': require('../workers/container-life-cycle-started.js')
  };

  WorkerServer._server = new ponos.Server({
    hermes: RabbitMQ.getSubscriber(),
    queues: Object.keys(tasks)
  });

  WorkerServer._server.setAllTasks(tasks);

  WorkerServer._server
    .start()
    .then(function () {
      log.trace('worker server started');
      cb();
    })
    .catch(function (err) {
      log.error({ err: err }, 'worker server failed to started');
      cb(err);
    });
};

/**
 * closes the server
 * @param  {Function} cb (err)
 */
WorkerServer.stop = function (cb) {
  log.info('stop');

  WorkerServer._server
    .stop()
    .then(function () {
      log.trace('worker server stopped');
      cb();
    })
    .catch(function (err) {
      log.error({ err: err }, 'worker server failed to stop');
      cb(err);
    });
};