'use strict';
var pubsub = require('./models/redis.js').pubSub;
var ip = require('ip');
var rollbar = require('rollbar');

/**
 * Module used to listen for and handle runnable events
 */
function Events () { }

/**
 * sets up event listeners for container events
 */
Events.listen = function () {
  pubsub.on('runnable:docker:events:die', Events.handleDie);
};

/**
 * kills sauron process on weave deaths so we can relaunch weave container
 * @param  {Object} data die event data
 */
Events.handleDie = function (data) {
  if (data &&
    data.from && ~data.from.indexOf('weaveworks/weave:0.11.1') &&
    data.host && data.host === 'http://' + ip.address() + ':4242') {

    rollbar.handleErrorWithPayloadData(new Error('weave died'),
      { custom: { host: data.host } }, function () {

      process.exit(1);
    });
  }
};
