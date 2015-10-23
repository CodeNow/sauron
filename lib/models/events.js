'use strict';
require('loadenv')();

var ip = require('ip');
var rollbar = require('rollbar');
var ErrorCat = require('error-cat');
var error = new ErrorCat();

var Redis = require('./redis.js');
var WeaveWrapper = require('./weave-wrapper.js');
var RabbitMq = require('./rabbitmq.js');

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
  Redis.pubSub.on('runnable:docker:events:start', Events._handleStart);
};

/**
 * stop listening for events
 */
Events.stop = function () {
  Redis.pubSub.removeAllListeners('runnable:docker:events:die');
  Redis.pubSub.removeAllListeners('runnable:docker:events:start');
};

/**
 * kills sauron process on weave deaths so we can relaunch weave container
 * @param  {Object} data die event data
 */
Events._handleDie = function (data) {
  if (!data) { return; }
  if (!Events._thisHost(data)) { return; }
  if (!Events._isWeaveContainer()) { return; }

  rollbar.handleErrorWithPayloadData(new Error('weave died'), {
    custom: { host: data.host }
  }, function () {
    process.exit(1);
  });
};

/**
 * attach all valid containers to weave network
 * @param  {Object} data die event data
 */
Events._handleStart = function (data) {
  if (!data) { return; }
  if (!Events._thisHost(data)) { return; }
  if (!Events._idNetworkNeeded(data)) { return; }

  WeaveWrapper.attach(data.from, function (err, containerIp) {
    if (err) { return error.report(err); }
    RabbitMq.publishNetworkAttached({
      containerId: data.from,
      containerIp: containerIp
    });
  });
};

/**
 * checks to see if event belongs to this host
 * @param  {Object}  data event data
 * @return {Boolean}      true if this host
 */
Events._thisHost = function (data) {
  return !!(data.host &&
    data.host === 'http://' + ip.address() + ':4242');
};

/**
 * checks to see if this container is the weave container
 * @param  {Object}  data event data
 * @return {Boolean}      true if this weave container
 */
Events._isWeaveContainer = function (data) {
  return !!(data.from &&
    ~data.from.indexOf(process.env.WEAVE_CONTAINER_NAME));
};

/**
 * filters down to containers that need network. filters out:
 * weave
 * @param  {Object}  data event data
 * @return {Boolean}      true if this container needs network
 */
Events._idNetworkNeeded = function (data) {
  return !!(data.from && !~data.from.indexOf('weave'));
};
