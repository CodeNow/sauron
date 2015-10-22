'use strict';
var Redis = require('./redis.js');
var ip = require('ip');
var rollbar = require('rollbar');

module.exports = Events;

/**
 * Module used to listen for and handle runnable events
 */
function Events () { }

/**
 * sets up event listeners for container events
 */
Events.listen = function () {
  Redis.pubSub.on('runnable:docker:events:die', Events._handleDie);
};

/**
 * kills sauron process on weave deaths so we can relaunch weave container
 * @param  {Object} data die event data
 */
Events._handleDie = function (data) {
  if (Events._isWeaveContainer()) {
    rollbar.handleErrorWithPayloadData(new Error('weave died'), {
      custom: { host: data.host }
    }, function () {
      process.exit(1);
    });
  }
};

Events._isWeaveContainer = function (data) {
  return !!(data &&
    data.from &&
    ~data.from.indexOf(process.env.WEAVE_CONTAINER_NAME) &&
    data.host &&
    data.host === 'http://' + ip.address() + ':4242');
};
