'use strict';
require('loadenv')();

var ErrorCat = require('error-cat');
var error = new ErrorCat();
var ip = require('ip');
var keypather = require('keypather')();
var TaskError = require('ponos').TaskError;

var log = require('../logger.js')();
var RabbitMQ = require('./rabbitmq.js');
var WeaveDiedError = require('../errors/weave-died-error.js');
var WeaveWrapper = require('./weave-wrapper.js');

module.exports = Events;

/**
 * Module used to handle runnable events
 */
function Events () { }

/**
 * kills sauron process on weave deaths so we can relaunch weave container
 * @param  {Object} data die event data
 */
Events.handleDied = function (data, cb) {
  log.info({ data: data }, 'handleDied');
  if (!Events._isThisHost(data)) { return cb(null); }
  if (!Events._isWeaveContainer(data)) { return cb(null); }
  var err = error.create(500, 'weave died', {
    host: ip.address(),
    data: data
  });

  error.report(function () {
    log.error('handleDied weave container died');
    cb(new WeaveDiedError(err));
  });
};

/**
 * attach all valid containers to weave network
 * publish error if non 409 error
 * publish network attached if successful
 * @param  {Object} data die event data
 * @param {Function} cb (err)
 */
Events.handleStarted = function (data, cb) {
  log.info({ data: data }, 'handleStarted');
  if (!Events._isNetworkNeeded(data)) { return cb(null); }

  WeaveWrapper.attach(data.id, function (err, containerIp) {
    var jobData = {
      instanceId: keypather.get(data, 'inspectData.Config.Labels.instanceId'),
      contextVersionId: keypather.get(data, 'inspectData.Config.Labels.contextVersionId'),
      containerId: data.id,
      host: data.host
    };

    if (err) {
      if (err.output.statusCode === 500) {
        return cb(new TaskError('handleStarted', 'unknown error', err));
      }

      jobData.err = err;
      RabbitMQ.publishContainerNetworkAttachFailed(jobData);
      return cb(null);
    }

    jobData.containerIp = containerIp;
    RabbitMQ.publishContainerNetworkAttached(jobData);
    return cb(null);
  });
};

/**
 * ensures all relevant keys are on data
 * @param  {Object}  data event data
 * @return {Boolean}      true if this host
 */
Events.validateJob = function (data) {
  return !!(data.id && data.host && data.from);
};

/**
 * checks to see if job belongs to this host
 * @param  {[type]}  data [description]
 * @return {Boolean}      [description]
 */
Events._isThisHost = function (data) {
  return data.host === 'http://' + ip.address() + ':4242';
};

/**
 * checks to see if this container is the weave container
 * image of weave container is weaveworks/weave:1.2.0
 * master weave container is the only one that exposes ports
 * @param  {Object}  data event data
 * @return {Boolean}      true if this weave container
 */
Events._isWeaveContainer = function (data) {
  var ports = keypather.get(data, 'inspectData.Config.ExposedPorts');

  return !!(ports &&
    ~data.from.indexOf(process.env.WEAVE_IMAGE_NAME));
};

/**
 * filters down to containers that need network. filters out:
 * weave, swarm, image-builder
 * @param  {Object}  data event data
 * @return {Boolean}      true if this container needs network
 */
Events._isNetworkNeeded = function (data) {
  var blackList = process.env.NETWORK_BLACKLIST.split(',');
  var isBlacklisted = blackList.some(function (item) {
    return ~data.from.indexOf(item);
  });

  return !isBlacklisted;
};
