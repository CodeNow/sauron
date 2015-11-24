'use strict';

var Peers = require('./models/peers.js');
var RabbitMQ = require('./models/rabbitmq.js');
var WorkerServer = require('./models/worker-server.js');

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
  RabbitMQ.create();
  WorkerServer.listen(function (err) {
    if (err) { return cb(err); }

    // empty string returns all docks
    Peers.getList('', function (err, docks) {
      if (err) { return cb(err); }

      docks.forEach(function (dockerHost) {
        RabbitMQ.publishWeaveStart(dockerHost);
      });

      cb(null);
    });
  });
};

/**
 * started listening for weave container deaths
 * @param  {Function} cb {err}
 */
Start.shutdown = function (cb) {
  WorkerServer.stop(function (err) {
    if (err) { return cb(err); }

    RabbitMQ.disconnectPublisher(cb);
  });
};
