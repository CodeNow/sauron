'use strict';

var WeaveSetup = require('./models/WeaveSetup.js');
var events = require('./models/events.js');

/**
 * in charge of starting the application
 */
function Start () { }

/**
 * started listening for weave container deaths
 * @param  {Function} cb {err}
 */
Start.startup = function (cb) {
  events.listen();
  WeaveSetup.setup(cb);
};
