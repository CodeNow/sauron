'use strict';

var WeaveSetup = require('./models/weave-setup.js');
var Events = require('./models/events.js');
var Redis = require('./models/redis.js');

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
  Events.listen();
  WeaveSetup.setup(cb);
};
