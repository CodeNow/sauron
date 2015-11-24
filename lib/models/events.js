'use strict';
require('loadenv')();

var keypather = require('keypather')();
var TaskError = require('ponos').TaskError;
var TaskFatalError = require('ponos').TaskFatalError;
var url = require('url');

var log = require('../logger.js')();
var Peers = require('./peers.js');
var RabbitMQ = require('./rabbitmq.js');
var WeaveWrapper = require('./weave-wrapper.js');

module.exports = Events;

/**
 * Module used to handle runnable events
 */
function Events () { }

/**
 * gets peers and connects weave to them
 * @param {Object} data job data
 *                   .dockerUri required format http://10.0.0.1:4242
 * @returns  {Promise} (err)
 */
Events.handleStart = function (data, cb) {
  log.info({ data: data }, 'setup');
  Peers.getList(data.orgId, function (err, peers) {
    if (err) { return cb(err); }
    var dockerHost = url.parse(data.dockerUri).host;
    var dockerHostname = url.parse(data.dockerUri).hostname;

    peers = peers.map(function (peer) {
      return url.parse(peer.dockerUri).hostname;
    });

    // ensure this target exist in peers, error if not
    var index = peers.indexOf(dockerHostname);
    if (index === -1) {
      return cb(new TaskFatalError('target not found'));
    }
    // remove target from peers
    peers.splice(index, 1);

    WeaveWrapper.launch(peers, dockerHost, cb);
  });
};

/**
 * publish start job is this is weave container
 * @param  {Object} data die event data
 *                    .host required format: http://10.0.0.1:4242
 *                    .tags required format: 'orgId,build,run'
 */
Events.handleDied = function (data) {
  log.info({ data: data }, 'handleDied');
  if (!Events._isWeaveContainer(data)) { return; }

  RabbitMQ.publishWeaveStart({
    dockerUri: data.host,
    orgId: data.tags.split(',')[0]
  });
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
  var dockerHost = url.parse(data.host).host;

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
