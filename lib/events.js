'use strict';
var pubsub = require('./models/redis.js').pubSub;
var ip = require('ip');
var rollbar = require('rollbar');

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
    console.log(data.from, data.host);
    console.log(~data.from.indexOf('weaveworks/weave:0.11.1'), data.host === ip.address());
    if (data &&
      data.from && ~data.from.indexOf('weaveworks/weave:0.11.1') &&
      data.host && data.host === 'http://' + ip.address() + ':4242') {

      rollbar.handleErrorWithPayloadData(new Error('weave died'),
        { custom: { host: data.host } }, function () {

        process.exit(1);
      });
    }
  });
}
