'use strict';
var pubsub = require('./models/redis.js').pubSub;
var weaver = require('./models/weaver.js');

/**
 * Eventing module for mavis. Currently only hooks into docker container
 * events being sent via redis pubsub.
 * @module mavis:events
 */
module.exports = {
  listen: listen
};

/**
 * Listens for docker events via redis pubsub.
 */
function listen () {
  pubsub.on('runnable:docker:events:die', function (data) {
    if (~data.from.indexOf('weave')) {
      weaver.setup(function(err) {
        if (err) {
          process.exit(1);
        }
      });
    }
  });
}
