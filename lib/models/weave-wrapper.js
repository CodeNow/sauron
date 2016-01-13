'use strict';
require('loadenv')();
var Promise = require('bluebird');

var child_process = require('child_process');
var ErrorCat = require('error-cat');
var error = new ErrorCat();
var ip = require('ip');
var isString = require('101/is-string');

var log = require('../logger.js')();
var RabbitMQ = require('./rabbitmq.js');

module.exports = WeaveWrapper;

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
  };
  log.info({ cmd: cmd, envs: envs }, '_runCmd');

  child_process.exec(cmd, {
    env: envs
  }, function (err, stdout, stderr) {
    if (err) {
      err.stderr = stderr;
    }

    cb(err, stdout);
  });
};

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
  log.info({ peers: peers }, 'launch');
  if (!Array.isArray(peers)) {
    return cb(error.createAndReport(400, 'invalid input', peers));
  }

  var cmd = [process.env.WEAVE_PATH,
    'launch-router',
    '--no-dns',
    '--ipalloc-range', process.env.WEAVE_IP_RANGE,
    '--ipalloc-default-subnet', process.env.WEAVE_IP_RANGE];
  cmd = cmd.concat(peers).join(' ');

  WeaveWrapper._runCmd(cmd, dockerHost,
    WeaveWrapper._handleCmdResult(cb, 'weave launch failed', {
      cmd: cmd,
      dockerHost: dockerHost,
      host: dockerHost,
      githubId: githubId
    }));
};


/**
 * Make weave to forget specified host
 * @param  {String}   dockerHost  target docker host
 *                      format: 10.0.0.1:4242
 * @param  {String}   hostToForget docker host to forget
 *                      format: 10.0.0.1
 * @param  {Function} cb          (err, allocated)
 */
WeaveWrapper.forget = function (dockerHost, hostToForget, cb) {
  log.info({ dockerHost: dockerHost }, 'forget');

  var cmd = [process.env.WEAVE_PATH,
    'forget',
    hostToForget
  ];
  cmd = cmd.join(' ');

  WeaveWrapper._runCmd(cmd, dockerHost,
    WeaveWrapper._handleCmdResult(cb, 'weave forget failed', {
      cmd: cmd,
      dockerHost: dockerHost
    }));
};

/**
 * Make weave to remove peer
 * @param  {String}   dockerHost  target docker host
 *                      format: 10.0.0.1:4242
 * @param  {String}   peer id
 *                      format: 42:23:27:ab:ad:59
 * @param  {Function} cb          (err, allocated)
 */
WeaveWrapper.rmpeer = function (dockerHost, peerId, cb) {
  log.info({ dockerHost: dockerHost, peerId: peerId }, 'rmpeer');

  var cmd = [process.env.WEAVE_PATH,
    'rmpeer',
    peerId
  ];
  cmd = cmd.join(' ');

  WeaveWrapper._runCmd(cmd, dockerHost,
    WeaveWrapper._handleCmdResult(cb, 'weave rmpeer failed', {
      cmd: cmd,
      dockerHost: dockerHost
    }));
};

/**
 * Make weave to return JSON report
 * @param  {String}   dockerHost  target docker host
 *                      format: 10.0.0.1:4242
 * @param  {Function} cb          (err, allocated)
 */
WeaveWrapper.report = function (dockerHost, cb) {
  log.info({ dockerHost: dockerHost }, 'report');

  var cmd = [process.env.WEAVE_PATH,
    'report'
  ];
  cmd = cmd.join(' ');

  var finalCallback = function (err, stdout) {
    if (err) {
      return cb(err)
    }
    cb(null, JSON.parse(stdout))
  }

  WeaveWrapper._runCmd(cmd, dockerHost,
    WeaveWrapper._handleCmdResult(finalCallback, 'weave rmpeer failed', {
      cmd: cmd,
      dockerHost: dockerHost
    }));
};

/**
 * attach IP addr to container
 * @param  {String}   containerId container to add to network
 * @param  {String}   dockerHost  target docker host
 *                      format: 10.0.0.1:4242
 * @param  {String}   githubId github id from the tag data
 * @param  {Function} cb (err, stdout)
 */
WeaveWrapper.attach = function (containerId, dockerHost, githubId, cb) {
  log.info({ containerId: containerId }, 'attach');
  if (!isString(containerId)) {
    return cb(error.createAndReport(400, 'invalid input', { containerId: containerId}));
  }

  var cmd = process.env.WEAVE_PATH + ' attach ' + containerId;

  WeaveWrapper._runCmd(cmd, dockerHost,
    WeaveWrapper._handleCmdResult(handleAttach, 'attach failed', {
      cmd: cmd,
      dockerHost: dockerHost,
      host: dockerHost,
      githubId: githubId
    }));

  function handleAttach (err, stdout) {
    if (err) { return cb(err); }
    // remove newline from output
    stdout = stdout.replace(/\n/, '');
    if(!ip.isV4Format(stdout)) {
      return cb(error.createAndReport(500, 'weave attach error', {
        containerId: containerId,
        stdout: stdout,
        err: err
      }));
    }
    cb(null, stdout);
  }
};

/**
 * wrap weave errors with boom
 * also set ignorable errors to 409
 * @param  {Function} cb       callback to call
 * @param  {Object}   message  additional message
 * @param  {Object}   errDebug additional data
 */
WeaveWrapper._handleCmdResult = function (cb, message, errDebug) {
  return function (err, stdout) {
    errDebug.err = err;
    errDebug.stdout = stdout;

    if (err && !_errorIs.weaveAlreadyRunning(err)) {
      log.error({ err: err }, '_handleCmdResult weave returned error');
      message = err.message ? message + ':' + err.message : message;
      var statusCode = WeaveWrapper._isIgnorable(err) ? 409 : 500;
      if (_errorIs.outOfMemory(err)) {
        log.error({
          err: err,
          errDebug: errDebug
        }, '_handleCmdResult handling dock unhealthy');
        RabbitMQ.publishOnDockUnhealthy(errDebug)
      }

      return cb(error.createAndReport(statusCode, message, errDebug));
    }

    log.info(errDebug, '_handleCmdResult success');
    cb(null, stdout);
  };
};

/**
 * checks to see if we can ignore this error
 * @param  {Object}  err object from result of cmd
 * @return {Boolean}     true if we can ignore, else false
 */
WeaveWrapper._isIgnorable = function (err) {
  return _errorIs.containerNotRunning(err) ||
   _errorIs.containerDied(err) ||
   _errorIs.noSuchContainer(err);
};

/**
 * string search for errors
 * @type {Object}
 */
var _errorIs = {
  containerNotRunning: function (err) {
    return /not running/i.test(err.message);
  },
  containerDied: function (err) {
    return /died/i.test(err.message);
  },
  noSuchContainer: function (err) {
    return /no such container/i.test(err.message);
  },
  outOfMemory: function (err) {
    return /cannot allocate memory/i.test(err.message);
  },
  weaveAlreadyRunning: function (err) {
    return /already running/i.test(err.message);
  }
};

Promise.promisifyAll(WeaveWrapper)
