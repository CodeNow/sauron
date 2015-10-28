'use strict';
require('loadenv')();

var ip = require('ip');
var ErrorCat = require('error-cat');
var error = new ErrorCat();
var domain = require('domain');

var Redis = require('./redis.js');
var WeaveWrapper = require('./weave-wrapper.js');
var RabbitMQ = require('./rabbitmq.js');
var log = require('../logger.js')();

module.exports = Events;

/**
 * Module used to listen for and handle runnable events
 */
function Events () { }

/**
 * sets up event listeners for container events
 */
Events.listen = function () {
  log.info('listen');
  Redis.pubSub.subscribe('runnable:docker:events:die');
  Redis.pubSub.subscribe('runnable:docker:events:start');

  Redis.pubSub.on('message', Events._domainRun);
};

/**
 * stop listening for events
 */
Events.stop = function () {
  log.info('stop');
  Redis.pubSub.removeAllListeners('runnable:docker:events:die');
  Redis.pubSub.removeAllListeners('runnable:docker:events:start');
};

/**
 * Runs handlers in domains
 * @param  {String} channel which this event is coming form
 * @param  {String} data    event data
 */
Events._domainRun = function (channel, data) {
  log.info({ channel: channel, data: data }, '_domainRun');
  var workerDomain = domain.create();
  workerDomain.on('error', function (err) {
    error.createAndReport(500, 'Events domain error', err);
  });
  workerDomain.run(function () {
    Events._handleEvent(channel, data);
  });
};
/**
 * root event handler, validate/parse data and send to correct handler
 * @param  {String} channel which this event is coming form
 * @param  {String} data    event data
 */
Events._handleEvent = function (channel, data) {
  log.info({ channel: channel, data: data }, '_handleEvent');
  data = JSON.parse(data);
  if (!Events._validate(data)) { return; }

  if (channel === 'runnable:docker:events:die') {
    Events._handleDie(data);
  } else if (channel === 'runnable:docker:events:start') {
    Events._handleStart(data);
  }
};

/**
 * kills sauron process on weave deaths so we can relaunch weave container
 * @param  {Object} data die event data
 */
Events._handleDie = function (data) {
  log.info({ data: data }, '_handleDie');
  if (!Events._isWeaveContainer(data)) { return; }

  error.createAndReport(500, 'weave died', { host: ip.address() });
  process.exit(1);
};

/**
 * attach all valid containers to weave network
 * @param  {Object} data die event data
 */
Events._handleStart = function (data) {
  log.info({ data: data }, '_handleStart');
  if (!Events._isNetworkNeeded(data)) { return; }

  WeaveWrapper.attach(data.id, function (err, containerIp) {
    if (err) { return error.report(err); }

    RabbitMQ.publishContainerNetworkAttached({
      containerId: data.id,
      host: data.host,
      containerIp: containerIp
    });
  });
};

/**
 * checks to see if event belongs to this host
 * @param  {Object}  data event data
 * @return {Boolean}      true if this host
 */
Events._validate = function (data) {
  return !!(data.id && data.host &&
    data.host === 'http://' + ip.address() + ':4242');
};

/**
 * checks to see if this container is the weave container
 * @param  {Object}  data event data
 * @return {Boolean}      true if this weave container
 */
Events._isWeaveContainer = function (data) {
  return !!(data.from &&
    ~data.from.indexOf(process.env.WEAVE_IMAGE_NAME));
};

/**
 * filters down to containers that need network. filters out:
 * weave
 * @param  {Object}  data event data
 * @return {Boolean}      true if this container needs network
 */
Events._isNetworkNeeded = function (data) {
  return !!(data.from && !~data.from.indexOf('weave'));
};
