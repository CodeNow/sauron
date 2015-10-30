'use strict';

var WeaveSetup = require('./models/weave-setup.js');
var Events = require('./models/events.js');
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
  RabbitMQ.connect();
  Redis.connect();
  Events.listen();
  WeaveSetup.setup(cb);
};

/**
 * started listening for weave container deaths
 * @param  {Function} cb {err}
 */
Start.shutdown = function (cb) {
  Redis.disconnect();
  Events.stop();
  RabbitMQ.disconnect(cb);
};
