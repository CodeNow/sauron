'use strict'
require('loadenv')()

const async = require('async')
const Promise = require('bluebird')
const url = require('url')
const WorkerStopError = require('error-cat/errors/worker-stop-error')
const WorkerError = require('error-cat/errors/worker-error')

const Docker = require('./docker')
const FailedAttach = require('../errors/failed-attach.js')
const InvalidArgument = require('../errors/invalid-argument.js')
const log = require('../logger.js')()
const RabbitMQ = require('./rabbitmq.js')
const WeaveError = require('../errors/weave-error.js')
const WeaveWrapper = require('./weave-wrapper.js')

module.exports = Events

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
  log.info({ data: data }, 'handleStart')
  Docker.findDocksByOrgId(data.orgId, function (err, peers) {
    if (err) { return cb(err) }
    var parsedHost = url.parse(data.dockerUri)
    var dockerHost = parsedHost.host
    var dockerHostname = parsedHost.hostname

    var hostnames = peers.map(function (peer) {
      return url.parse('http://' + peer.Host).hostname
    })

    // ensure this target exist in peers, error if not
    var index = hostnames.indexOf(dockerHostname)
    if (index === -1) {
      return cb(new WorkerStopError(
        'target not found',
        { job: data }
      ))
    }
    // remove target from hostnames
    hostnames.splice(index, 1)

    WeaveWrapper.launch(hostnames, dockerHost, data.orgId, cb)
  })
}

/**
 * Remove weave peer.
 * 1. find a host on which to run weave rmpeer. Should be run only on the one host
 * 2. run weave rmpeer on the found host
 * @param {String} - hostname of the removed dock
 * @param {String} - org id
 */
Events._removeWeavePeer = function (hostname, orgId, cb) {
  var logger = log.child({
    hostname: hostname,
    orgId: orgId
  })
  logger.info('Events._removeWeavePeer')
  Docker.findLightestOrgDock(orgId, function (err, dock) {
    if (err) {
      return cb(err)
    }
    if (!dock) {
      return cb(new WorkerStopError('No docks left for an org'))
    }
    logger.trace({ dock: dock }, '_removeWeavePeer found dock')
    var dockerHost = dock.Host
    if (!dockerHost) {
      return cb(new WorkerStopError('Dock has not host data'))
    }
    logger.trace({ dockerHost: dockerHost }, '_removeWeavePeer found dock host')
    RabbitMQ.publishWeavePeerRemove({
      dockerHost: dockerHost,
      hostname: hostname,
      orgId: orgId
    })
    cb()
  })
}

/**
 * Forget weave peer.
 * 1. find all hosts which should forget about weave peer
 * 2. run weave forget on all found hosts
 * @param {String} - hostname of the removed dock
 * @param {String} - org id
 */
Events._forgetWeavePeer = function (hostname, orgId, cb) {
  log.info({ hostname: hostname, orgId: orgId }, 'Events._forgetWeavePeer')
  Docker.findDocksByOrgId(orgId, function (err, orgDocks) {
    if (err) { return cb(err) }
    orgDocks.forEach(function (dock) {
      RabbitMQ.publishWeavePeerForget({
        dockerHost: dock.Host,
        hostname: hostname
      })
    })
    cb()
  })
}

/**
 * gets peers and creates `weave.peer.forget` and `weave.peer.remove` jobs for each of them
 * @param {Object} data job data
 *                   host required format http://10.0.0.1:4242
 *                   org github org id
 * @returns  {Promise} (err)
 */
Events.handleDockerEventStreamDisconnected = function (data, cb) {
  var logger = log.child({
    method: 'handleDockerEventStreamDisconnected',
    data: data
  })
  logger.info('call')
  var parsedHost = url.parse(data.host)
  var parsedHostname = parsedHost.hostname
  var dockerHost = parsedHost.host
  // gets all peers
  Docker.doesDockExist(dockerHost).asCallback(function (err, doesExist) {
    if (err) {
      logger.error({ err: err }, 'does docker exist error')
      return cb(new WorkerError('handleDockerEventStreamDisconnected: unknown error', err))
    }
    if (!doesExist) {
      logger.trace('dock does not exist')
      async.parallel([
        Events._removeWeavePeer.bind(Events, parsedHostname, data.org),
        Events._forgetWeavePeer.bind(Events, parsedHostname, data.org)
      ], cb)
    } else {
      logger.trace('dock does exist. Do not mess with network')
      cb()
    }
  })
}

/**
 * publish start job if this is a weave container
 * @param  {Object} data die event data
 *                    host required format: http://10.0.0.1:4242
 *                    tags required format: 'orgId,build,run'
 */
Events.handleDied = function (data) {
  log.info({ data: data }, 'handleDied')
  if (!Events._isWeaveContainer(data)) { return }

  RabbitMQ.publishWeaveStart({
    dockerUri: data.host,
    orgId: data.tags.split(',')[0]
  })
}

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
  var logger = log.child({
    method: 'handleStarted',
    data: data
  })
  logger.info('handleStarted called')
  if (!Events._isNetworkNeeded(data)) { return cb(null) }
  var dockerHost = url.parse(data.host).host
  var orgId = data.tags.split(',')[0]
  // gets all peers
  Docker.doesDockExist(dockerHost).asCallback(function (err, doesExist) {
    if (err) {
      return cb(new WorkerError('handleStarted: unknown error', err))
    }
    if (!doesExist) {
      logger.trace({ dockUri: data.host }, 'dock does not exist')
      var fatal = new WorkerStopError('dock no longer exists')
      fatal.report = false
      return cb(fatal)
    }

    WeaveWrapper.attach(data.id, dockerHost, orgId, function (err, containerIp) {
      if (err) {
        logger.error({ err: err }, 'attach error')

        if (err instanceof FailedAttach) {
          return cb(new WorkerError('handleStarted: failed to attach', err))
        }

        if (err instanceof InvalidArgument) {
          return cb(new WorkerStopError('handleStarted: invalid input', err))
        }

        if (err instanceof WeaveError) {
          if (err.isIgnorable()) {
            return cb(new WorkerStopError('handleStarted: ignore error', err))
          }

          return cb(new WorkerError('handleStarted: unknown error', err))
        }

        // TODO: we can probably remove this?
        // check logs for this message, if you don't see it remove this line
        logger.error({ err: err }, 'handleStarted: ignore unknown error')
        return cb(null)
      }
      // if container has no inspect data it's non-user container
      if (!data.inspectData) {
        return cb(null)
      }
      data.containerIp = containerIp

      try {
        RabbitMQ.publishContainerNetworkAttached(data)
      } catch (err) {
        return cb(err)
      }

      return cb(null)
    })
  })
}

/**
 * checks to see if this container is the weave container
 * image of weave container is weaveworks/weave:1.2.0
 * @param  {Object}  data event data
 * @return {Boolean}      true if this weave container
 */
Events._isWeaveContainer = function (data) {
  var image = data.from || ''
  return !!~image.indexOf(process.env.WEAVE_IMAGE_NAME)
}

/**
 * filters down to containers that need network. filters out:
 * weave, swarm, image-builder
 * @param  {Object}  data event data
 * @return {Boolean}      true if this container needs network
 */
Events._isNetworkNeeded = function (data) {
  var blackList = process.env.NETWORK_BLACKLIST.split(',')
  var isBlacklisted = blackList.some(function (item) {
    return ~data.from.indexOf(item)
  })

  return !isBlacklisted
}

Promise.promisifyAll(Events)
