'use strict';
require('loadenv')();

var ErrorCat = require('error-cat');
var error = new ErrorCat();
var child_process = require('child_process');
var isString = require('101/is-string');

var log = require('../logger.js')();

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

function WeaveWrapper () { }

/**
 * run cmd in a child process
 * @param  {[type]}   cmd command to run
 * @param  {Function} cb  (err, stdout)
 */
WeaveWrapper._runCmd = function (cmd, cb) {
  log.info({ cmd: cmd }, '_runCmd');
  child_process.exec(cmd, function (err, stdout, stderr) {
    if (err) {
      err.stderr = stderr;
    }

    cb(err, stdout);
  });
};

/**
 * launch weave application
 * @param  {Object}   peers array of ipaddr of peers
 * @param  {Function} cb (err, allocated)
 */
WeaveWrapper.launch = function (peers, cb) {
  log.info({ peers: peers }, 'launch');
  if (!Array.isArray(peers)) {
    return cb(error.createAndReport(400, 'invalid input', peers));
  }

  var cmd = [process.env.WEAVE_PATH,
    'launch-router',
    '--no-dns',
    '--ipalloc-range', process.env.WEAVE_IP_RANGE,
    '--ipalloc-default-subnet', process.env.WEAVE_IP_RANGE];
  cmd = cmd.concat(peers);

  WeaveWrapper._runCmd(cmd.join(' '),
    WeaveWrapper.handleErr(cb, 'weave launch failed', { cmd: cmd }));
};

/**
 * attach IP addr to container
 * @param  {String}   containerId container to add to network
 * @param  {Function} cb (err, stdout)
 */
WeaveWrapper.attach = function (containerId, cb) {
  log.info({ containerId: containerId }, 'attach');
  if (!isString(containerId)) {
    return cb(error.createAndReport(400, 'invalid input', { containerId: containerId}));
  }
  var cmd = process.env.WEAVE_PATH + ' attach ' + containerId;

  WeaveWrapper._runCmd(cmd, function (err, data) {
    if (err) {
      return WeaveWrapper.handleErr(cb, 'attach failed', { cmd: cmd })(err);
    }
    // remove newline from output
    cb(null, data.replace(/\n/, ''));
  });
};

/**
 * wrap weave errors with boom
 * also ignore known errors
 * @param  {Function} cb       callback to call
 * @param  {Object}   message  additional message
 * @param  {Object}   errDebug additional data
 */
WeaveWrapper.handleErr = function (cb, message, errDebug) {
  return function (err) {
    if (err && !_errorIs.weaveAlreadyRunning(err)) {
      log.info({ err: err }, 'handleErr weave returned error');
      errDebug.err = err;
      message = err.message ? message + ':' + err.message : message;
      var statusCode = _errorIs.containerNotRunning(err) ||
        _errorIs.containerDied(err) ? 409 : 500;

      return cb(error.createAndReport(statusCode, message, errDebug));
    }
    arguments[0] = null;
    log.info({ arguments: arguments }, 'handleErr');
    cb.apply(this, arguments);
  };
};

/**
 * string string search for errors
 * @type {Object}
 */
var _errorIs = {
  containerNotRunning: function (err) {
    return /not running/.test(err.message);
  },
  containerDied: function (err) {
    return /died/.test(err.message);
  },
  weaveAlreadyRunning: function (err) {
    return /already running/i.test(err.message);
  }
};
