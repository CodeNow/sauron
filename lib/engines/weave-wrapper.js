'use strict';
require('../loadenv.js')();

var runCmd = require('../executors/' + process.env.EXECUTOR);
var error = require('../helpers/error.js');

/* Current commands supported
  Usage:
  weave launch <ipaddr>/<subnet> [-password <password>] <peer_host> ...
  weave attach <ipaddr>/<subnet> <container_id>
  weave detach <ipaddr>/<subnet> <container_id>
  weave status
*/

module.exports = WeaveWrapper;

function WeaveWrapper () { }

/**
 * runs weave status
 * @param  {Function} cb callback with (err, out)
 */
WeaveWrapper.prototype.status = function (cb) {
  runCmd('weave status', cb);
};

/**
 * setup weave application. downloads correct images
 * @param  {Function} cb (err, allocated)
 */
WeaveWrapper.prototype.setup = function (cb) {
  runCmd('weave setup', cb);
};

/**
 * launch weave application
 * @param  {Object}   options to pass into weave
 *   ipaddr   {String}: ipaddr of this router
 *   subnet   {String}: subnet of weave network
 *   password {String}: password for network
 *   peers    {String}: array of ipaddr of peers
 * @param  {Function} cb (err, allocated)
 */
WeaveWrapper.prototype.launch = function (options, cb) {
  if (!options || typeof options.password !== 'string') {
    return cb(error.boom(400, 'invalid input', options));
  }

  var cmd = 'weave launch-router --no-dns -password  --init-peer-count 3 ' + options.password;

  runCmd(cmd, handleErr(cb, 'weave launch failed', { cmd: cmd }));
};

/**
 * attach IP addr to container
 * @param  {Object}   options to pass into weave
 *   ipaddr      {String}: ipaddr of this router
 *   subnet      {String}: subnet of weave network
 *   containerId {String}: id of container to add
 * @param  {Function} cb (err, stdout)
 */
WeaveWrapper.prototype.attach = function (options, cb) {
  if (!options || typeof options.containerId !== 'string') {
    return cb(error.boom(400, 'invalid input', options));
  }

  var cmd = 'weave attach ' + options.containerId;
  runCmd(cmd, handleErr(cb, 'attach failed', { cmd: cmd }));
};

/**
 * detach IP addr from container
 * @param  {Object}   options to pass into weave
 *   ipaddr      {String}: ipaddr of this router
 *   subnet      {String}: subnet of weave network
 *   containerId {String}: id of container to add
 * @param  {Function} cb (err, stdout)
 */
WeaveWrapper.prototype.detach = function (options, cb) {
  if (!options || typeof options.containerId !== 'string') {
    return cb(error.boom(400, 'invalid input', options));
  }

  var cmd = 'weave detach' +
    ' ' + options.ipaddr +
    '/' + options.subnet +
    ' ' + options.containerId;

  runCmd(cmd, handleErr(cb, 'detach failed', { cmd: cmd }));
};


var errorIs = {
  containerNotRunning: function (err) {
    return /not running/.test(err.message);
  },
  containerDied: function (err) {
    return /died/.test(err.message);
  },
  cannotDestroyContainer: function (err) {
    return /cannot destroy container/i.test(err.message);
  }
};

WeaveWrapper.prototype.handleErr = function (cb, message, errDebug) {
  return function (err) {
    if (err && !errorIs.cannotDestroyContainer(err)) {
      errDebug.err = err;
      message = err.message ? message+': '+err.message : message;
      var statusCode = errorIs.containerNotRunning(err) || errorIs.containerDied(err) ?
        409 : 500;
      cb(error.boom(statusCode, message, errDebug));
    }
    else {
      arguments[0] = null; // ignored error
      cb.apply(this, arguments);
    }
  };
}
