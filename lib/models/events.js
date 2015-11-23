'use strict';
require('loadenv')();

var keypather = require('keypather')();
var TaskError = require('ponos').TaskError;
var url = require('url');

var log = require('../logger.js')();
var RabbitMQ = require('./rabbitmq.js');
var WeaveWrapper = require('./weave-wrapper.js');

module.exports = Events;

/**
 * Module used to handle runnable events
 */
function Events () { }

/**
 * publish start job is this is weave container
 * @param  {Object} data die event data
 *                    .host required format: http://10.0.0.1:4242
 */
Events.handleDied = function (data) {
  log.info({ data: data }, 'handleDied');
  if (!Events._isWeaveContainer(data)) { return; }
  var dockerHost = Events._getDockerHost(data);

  RabbitMQ.publishWeaveStart(dockerHost);
};

/**
 * attach all valid containers to weave network
 * publish error if non 409 error
 * publish network attached if successful
 * @param  {Object} data die event data
 *                    .id          docker container id
 *                    .host required format: http://10.0.0.1:4242
 * @param {Function} cb (err)
 */
Events.handleStarted = function (data, cb) {
  log.info({ data: data }, 'handleStarted');
  if (!Events._isNetworkNeeded(data)) { return cb(null); }
  var dockerHost = Events._getDockerHost(data);

  WeaveWrapper.attach(data.id, dockerHost, function (err, containerIp) {
    if (err) {
      if (err.output.statusCode === 500) {
        return cb(new TaskError('container.life-cycle.died', 'unknown error', err));
      }
      data.err = err;
      RabbitMQ.publishContainerNetworkAttachFailed(data);
      return cb(null);
    }

    data.containerIp = containerIp;
    RabbitMQ.publishContainerNetworkAttached(data);
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
 * gets correctly formatted docker host from data
 * @param  {Object}  data job data
 *                     .host docker host format http://10.0.0.1:4242
 * @return {String}  properly formated docker host
 *                     format: 10.0.0.1:4242
 */
Events._getDockerHost = function (data) {
  var parsed = url.parse(data.host);
  return parsed.host;
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
