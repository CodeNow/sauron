'use strict'
require('loadenv')()

var childProcess = require('child_process')
var ip = require('ip')
var isString = require('101/is-string')
var Promise = require('bluebird')

var FailedAttach = require('../errors/failed-attach.js')
var InvalidArgument = require('../errors/invalid-argument.js')
var WeaveError = require('../errors/weave-error.js')
var log = require('../logger.js')()
var RabbitMQ = require('./rabbitmq.js')

module.exports = WeaveWrapper

/**
 * Module used to wrap weave cli
 * Current commands supported Usage:
 * weave launch-router [--password <password>] [--nickname <nickname>]
 *                     [--ipalloc-range <cidr> [--ipalloc-default-subnet <cidr>]]
 *                     [--no-discovery] [--init-peer-count <count>]
 * weave attach        [<addr> ...] <container_id>
 * weave status
 *
 */

/**
 * WeaveWrapper constructor
 */
function WeaveWrapper () {}

/**
 * run cmd in a child process with weave remote envs
 * @param  {String}   cmd  command to run
 * @param  {String}   dockerHost target host format: 10.0.0.1:4242
 * @param  {Function} cb   (err, stdout)
 */
WeaveWrapper._runCmd = function (cmd, dockerHost, cb) {
  var envs = {
    DOCKER_HOST: dockerHost,
    DOCKER_TLS_VERIFY: 1,
    DOCKER_CERT_PATH: process.env.DOCKER_CERT_PATH
  }
  log.info({ cmd: cmd, envs: envs }, '_runCmd')

  childProcess.exec(cmd, {
    env: envs
  }, function (err, stdout, stderr) {
    log.trace({ cmd: cmd, err: err, stdout: stdout, stderr: stderr }, '_runCmd result')
    if (err) {
      err.stderr = stderr
    }

    cb(err, stdout)
  })
}

/**
 * launch weave application
 * @param  {Object}   peers       array of ipaddr of peers
 *                      format: [10.0.0.1:4242, 10.0.0.2:4242, ...]
 * @param  {String}   dockerHost  target docker host
 *                      format: 10.0.0.1:4242
 * @param  {String}   githubId github id from the tag data
 * @param  {Function} cb          (err, allocated)
 */
WeaveWrapper.launch = function (peers, dockerHost, githubId, cb) {
  log.info({ peers: peers }, 'WeaveWrapper.launch')
  if (!Array.isArray(peers)) {
    return cb(new InvalidArgument(peers, 'peers', 'Array'))
  }

  var cmd = [
    "WEAVE_DOCKER_ARGS='--log-driver=syslog'",
    process.env.WEAVE_PATH,
    'launch-router',
    '--no-dns',
    '--ipalloc-range', process.env.WEAVE_IP_RANGE,
    '--ipalloc-default-subnet', process.env.WEAVE_IP_RANGE]
  cmd = cmd.concat(peers).join(' ')

  WeaveWrapper._runCmd(cmd, dockerHost,
    WeaveWrapper._handleCmdResult(cb, 'weave launch failed', cmd, {
      dockerHost: dockerHost,
      host: dockerHost,
      githubId: githubId
    }))
}

/**
 * Make weave to forget specified host
 * @param  {String}   dockerHost  target docker host
 *                      format: 10.0.0.1:4242
 * @param  {String}   hostname  docker hostname to forget
 *                      format: 10.0.0.1
 * @param  {Function} cb          (err, allocated)
 */
WeaveWrapper.forget = function (dockerHost, hostname, cb) {
  log.info({ dockerHost: dockerHost, hostname: hostname }, 'WeaveWrapper.forget')

  var cmd = [
    process.env.WEAVE_PATH,
    'forget',
    hostname
  ].join(' ')

  WeaveWrapper._runCmd(cmd, dockerHost,
    WeaveWrapper._handleCmdResult(cb, 'weave forget failed', cmd, {
      dockerHost: dockerHost
    }))
}

/**
 * Make weave to remove peer
 * @param  {String}   dockerHost  target docker host in format 10.0.0.1:4242
 * @param  {String}   peer id in format  42:23:27:ab:ad:59
 * @param  {Function} cb  (err, allocated)
 */
WeaveWrapper.rmpeer = function (dockerHost, peerId, cb) {
  log.info({ dockerHost: dockerHost, peerId: peerId }, 'WeaveWrapper.rmpeer')

  var cmd = [
    process.env.WEAVE_PATH,
    'rmpeer',
    peerId
  ].join(' ')

  WeaveWrapper._runCmd(cmd, dockerHost,
    WeaveWrapper._handleCmdResult(cb, 'weave rmpeer failed', cmd, {
      dockerHost: dockerHost
    }))
}

/**
 * Make weave to return JSON report
 * @param  {String}   dockerHost  target docker host in format 10.0.0.1:4242
 * @param  {Function} cb  (err, allocated)
 */
WeaveWrapper.report = function (dockerHost, cb) {
  log.info({ dockerHost: dockerHost }, 'WeaveWrapper.report')

  var cmd = [
    process.env.WEAVE_PATH,
    'report'
  ].join(' ')

  var finalCallback = function (err, stdout) {
    if (err) {
      log.error({ err: err, dockerHost: dockerHost }, ' report error')
      return cb(err)
    }
    cb(null, JSON.parse(stdout))
  }

  WeaveWrapper._runCmd(cmd, dockerHost,
    WeaveWrapper._handleCmdResult(finalCallback, 'weave report failed', cmd, {
      dockerHost: dockerHost
    }))
}

/**
 * attach IP addr to container
 * @param  {String}   containerId container to add to network
 * @param  {String}   dockerHost  target docker host in format 10.0.0.1:4242
 * @param  {String}   githubId github id from the tag data
 * @param  {Function} cb  (err, stdout)
 *         error types: InvalidArgument, FailedAttach, WeaveError
 */
WeaveWrapper.attach = function (containerId, dockerHost, githubId, cb) {
  var logger = log.child({ containerId: containerId, dockerHost: dockerHost, githubId: githubId })
  logger.info('WeaveWrapper.attach')
  if (!isString(containerId)) {
    logger.error('attach invalid containerId')
    return cb(new InvalidArgument(containerId, 'containerId', 'String'))
  }

  var cmd = process.env.WEAVE_PATH + ' attach ' + containerId

  WeaveWrapper._runCmd(cmd, dockerHost,
    WeaveWrapper._handleCmdResult(handleAttach, 'attach failed', cmd, {
      dockerHost: dockerHost,
      host: dockerHost,
      githubId: githubId
    }))

  function handleAttach (err, stdout) {
    if (err) { return cb(err) }
    // remove newline from output
    stdout = stdout.replace(/\n/, '')
    if (!ip.isV4Format(stdout)) {
      logger.error({ stdout: stdout }, 'attach failed, malformed ip returned')
      return cb(new FailedAttach(containerId, stdout))
    }
    logger.info({ stdout: stdout }, 'attach success')
    cb(null, stdout)
  }
}

/**
 * wrap weave errors with boom
 * also set ignorable errors to 409
 * @param  {Function} cb       callback to call
 * @param  {Object}   message  additional message
 * @param  {Object}   errDebug additional data
 */
WeaveWrapper._handleCmdResult = function (cb, message, command, errDebug) {
  return function (err, stdout) {
    if (!err) {
      log.info({
        info: errDebug,
        command: command,
        message: message
      }, '_handleCmdResult success')
      return cb(null, stdout)
    }

    const weaveError = new WeaveError(err, stdout, err.stderr, command, errDebug)

    if (weaveError.weaveAlreadyRunning()) {
      log.info({
        info: errDebug,
        command: command,
        message: message
      }, '_handleCmdResult success, ignoring already running error')
      return cb(null, stdout)
    }

    if (weaveError.outOfMemory()) {
      log.error({
        err: weaveError,
        errDebug: errDebug,
        command: command,
        message: message
      }, '_handleCmdResult handling dock unhealthy')
      RabbitMQ.publishOnDockUnhealthy(errDebug)
    }

    log.error({
      command: command,
      err: weaveError,
      message: message
    }, '_handleCmdResult weave returned error')
    return cb(weaveError)
  }
}

Promise.promisifyAll(WeaveWrapper)
