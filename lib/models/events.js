'use strict';
require('loadenv')();

var keypather = require('keypather')();
var TaskError = require('ponos').TaskError;
var TaskFatalError = require('ponos').TaskFatalError;
var pluck = require('101/pluck');
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
 *                   dockerUri required format http://10.0.0.1:4242
 * @returns  {Promise} (err)
 */
Events.handleStart = function (data, cb) {
  log.info({ data: data }, 'handleStart');
  Peers.getList(data.orgId, function (err, peers) {
    if (err) { return cb(err); }
    var parsedHost = url.parse(data.dockerUri);
    var dockerHost = parsedHost.host;
    var dockerHostname = parsedHost.hostname;

    var hostnames = peers.map(function (peer) {
      return url.parse(peer.dockerUri).hostname;
    });

    // ensure this target exist in peers, error if not
    var index = hostnames.indexOf(dockerHostname);
    if (index === -1) {
      return cb(new TaskFatalError(
        'weave.start',
        'target not found',
        { job: data }
      ));
    }
    // remove target from hostnames
    hostnames.splice(index, 1);

    WeaveWrapper.launch(hostnames, dockerHost, data.orgId, cb);
  });
};

/**
 * gets peers and creates `weave.forget` job for each of them
 * @param {Object} data job data
 *                   host required format http://10.0.0.1:4242
 * @returns  {Promise} (err)
 */
Events.handleDockRemoved = function (data, cb) {
  log.info({ data: data }, 'handleDockRemoved');
  Peers.getList(data.githubId, function (err, peers) {
    if (err) { return cb(err); }
    var parsedHost = url.parse(data.host);
    var dockerHost = parsedHost.hostname;
    var peerDockerUris = peers.map(pluck('dockerUri'))
    var peerHosts = peerDockerUris.map(function (dockerUri) {
      return url.parse(dockerUri).host
    })
    peerHosts.forEach(function (peerHost) {
      RabbitMQ.publishWeaveForget({
        dockerHost: peerHost,
        host: dockerHost
      })
    })
    cb()
  });
};

/**
 * publish start job if this is a weave container
 * @param  {Object} data die event data
 *                    host required format: http://10.0.0.1:4242
 *                    tags required format: 'orgId,build,run'
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
 *                    id          docker container id
 *                    host required format: http://10.0.0.1:4242
 * @param {Function} cb (err)
 */
Events.handleStarted = function (data, cb) {
  log.info({ data: data }, 'handleStarted');
  if (!Events._isNetworkNeeded(data)) { return cb(null); }
  var dockerHost = url.parse(data.host).host;
  var orgId = data.tags.split(',')[0];
  // gets all peers
  Peers.doesDockExist(data.host, function (err, doesExist) {
    if (err) {
      return cb(new TaskError('container.life-cycle.started', 'doesDockExist: unknown error', err));
    }

    if (!doesExist) {
      log.trace({ dockUri: data.host }, 'doesDockExist: dock does not exist');
      return cb(new TaskFatalError('dock no longer exists'));
    }

    WeaveWrapper.attach(data.id, dockerHost, orgId, function (err, containerIp) {
      if (err) {
        var statusCode = keypather.get(err, 'output.statusCode')
        // if we get 409 that means we can finish this job and user will see exit code 55 and
        // Runnable network attach failed
        if (statusCode === 409) {
          var fatal = new TaskFatalError('container.life-cycle.started', 'attach: unknown error', err)
          fatal.report = false
          return cb(fatal);
        }
        if (statusCode === 500) {
          return cb(new TaskError('container.life-cycle.started', 'attach: unknown error', err));
        }
        return cb(null);
      }
      data.containerIp = containerIp;
      try {
        RabbitMQ.publishContainerNetworkAttached(data);
      } catch (err) {
        return cb(err);
      }

      return cb(null);
    });
  });
};

/**
 * ensures all relevant keys are on data for a container job
 * @param  {Object}  data event data
 * @return {Boolean}      true if job valid
 */
Events.validateContainerJob = function (data) {
  return !!(data.id && data.host && data.from && data.tags);
};

/**
 * ensures all relevant keys are on data for a docker job
 * @param  {Object}  data event data
 * @return {Boolean}      true if job valid
 */
Events.validateDockerJob = function (data) {
  return !!(data.host && data.tags);
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
