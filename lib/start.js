'use strict';

var WeaveSetup = require('./models/weave-setup.js');
var Events = require('./models/events.js');
var Redis = require('./models/redis.js');
var RabbitMq = require('./models/rabbitmq.js');

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
  RabbitMq.connect();
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
  RabbitMq.disconnect(cb);
};
