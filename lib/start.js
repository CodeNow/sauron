'use strict';

var WorkerServer = require('./models/worker-server.js');
var Redis = require('./models/redis.js');
var RabbitMQ = require('./models/rabbitmq.js');

module.exports = Start;

/**
 * in charge of starting the application
 */
function Start () { }

/**
 * started listening for weave container deaths
 * @param  {Function} cb {err}
 */
Start.startup = function (cb) {
  Redis.connect();
  RabbitMQ.create();
  RabbitMQ.publishWeaveStart();
  WorkerServer.listen(cb);
};

/**
 * started listening for weave container deaths
 * @param  {Function} cb {err}
 */
Start.shutdown = function (cb) {
  Redis.disconnect();
  WorkerServer.stop(function (err) {
    if (err) { return cb(err); }
    RabbitMQ.disconnectPublisher(cb);
  });
};
