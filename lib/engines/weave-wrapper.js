'use strict';
require('loadenv')();

var error = require('../helpers/error.js');
var child_process = require('child_process');

var weavePath = process.env.WEAVE_PATH;

/* Current commands supported
  Usage:
  weave launch-router [--password <password>] [--nickname <nickname>]
                      [--ipalloc-range <cidr> [--ipalloc-default-subnet <cidr>]]
                      [--no-discovery] [--init-peer-count <count>]
  weave attach        [<addr> ...] <container_id>
  weave status
*/

module.exports = WeaveWrapper;

function WeaveWrapper () { }

/**
 * run cmd in a child process
 * @param  {[type]}   cmd command to run
 * @param  {Function} cb  (err, stdout)
 */
WeaveWrapper._runCmd = function (cmd, cb) {
  child_process.exec(cmd, function (err, stdout, stderr) {
    if (err) {
      err.stderr = stderr;
    }

    cb(err, stdout);
  });
};

/**
 * launch weave application
 * @param  {Object}   options to pass into weave
 *   password {String}: password for network
 *   peers    {String}: array of ipaddr of peers
 * @param  {Function} cb (err, allocated)
 */
WeaveWrapper.prototype.launch = function (options, cb) {
  if (!options ||
    typeof options.password !== 'string' ||
    typeof options.peers !== 'object') {
    return cb(error.boom(400, 'invalid input', options));
  }

  var cmd = [weavePath, 'launch-router', '--no-dns',
    '--password', options.password,
    '--ipalloc-range', process.env.IP_RANGE,
    '--ipalloc-default-subnet', process.env.IP_RANGE];
  cmd = cmd.concat(options.peers);

  WeaveWrapper.runCmd(cmd.join(' '), this.handleErr(cb, 'weave launch failed', { cmd: cmd }));
};

/**
 * attach IP addr to container
 * @param  {String}   containerId container to add to network
 * @param  {Function} cb (err, stdout)
 */
WeaveWrapper.prototype.attach = function (containerId, cb) {
  if (containerId !== 'string') {
    return cb(error.boom(400, 'invalid input', { containerId: containerId}));
  }
  var cmd = weavePath + ' attach ' + containerId;

  WeaveWrapper.runCmd(cmd, this.handleErr(cb, 'attach failed', { cmd: cmd }));
};

/**
 * wrap weave errors with boom
 * also ignore known errors
 * @param  {Function} cb       callback to call
 * @param  {[type]}   message  additional message
 * @param  {[type]}   errDebug additional data
 */
WeaveWrapper.prototype.handleErr = function (cb, message, errDebug) {
  return function (err) {
    if (err &&
      !WeaveWrapper._errorIs.cannotDestroyContainer(err) &&
      !WeaveWrapper._errorIs.weaveAlreadyRunning(err)) {

      errDebug.err = err;
      message = err.message ? message + ':' + err.message : message;
      var statusCode = WeaveWrapper._errorIs.containerNotRunning(err) ||
        WeaveWrapper.containerDied(err) ? 409 : 500;

      return cb(error.boom(statusCode, message, errDebug));
    }

    arguments[0] = null; // ignored error
    cb.apply(this, arguments);
  };
};

/**
 * string string search for errors
 * @type {Object}
 */
WeaveWrapper._errorIs = {
  containerNotRunning: function (err) {
    return /not running/.test(err.message);
  },
  containerDied: function (err) {
    return /died/.test(err.message);
  },
  cannotDestroyContainer: function (err) {
    return /cannot destroy container/i.test(err.message);
  },
  weaveAlreadyRunning: function (err) {
    return /already running/i.test(err.message);
  }
};
