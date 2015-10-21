'use strict';
var pubsub = require('./models/redis.js').pubSub;

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
    if (data && data.from && ~data.from.indexOf('weaveworks/weave:0.11.1')) {
      process.exit(1);
    }
  });
}
