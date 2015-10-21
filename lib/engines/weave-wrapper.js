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

/**
 * runs weave status
 * @param  {Function} cb callback with (err, out)
 */
function status(cb) {
  runCmd('weave status', cb);
}

/**
 * setup weave application. downloads correct images
 * @param  {Function} cb (err, allocated)
 */
function setup(cb) {
  var cmd = 'weave setup';
  runCmd(cmd, cb);
}

/**
 * launch weave application
 * @param  {Object}   options to pass into weave
 *   ipaddr   {String}: ipaddr of this router
 *   subnet   {String}: subnet of weave network
 *   password {String}: password for network
 *   peers    {String}: array of ipaddr of peers
 * @param  {Function} cb (err, allocated)
 */
function launch(options, cb) {
  if (!options ||
    typeof options.password !== 'string' ||
    typeof options.peers !== 'object') {
    return cb(error.boom(400, 'invalid input', options));
  }

  var cmd = 'weave launch-router -password ' + options.password;

  options.peers.forEach(function(item) {
    cmd += ' ' + item;
  });

  runCmd(cmd, handleErr(cb, 'weave launch failed', { cmd: cmd }));
}

/**
 * attach IP addr to container
 * @param  {Object}   options to pass into weave
 *   ipaddr      {String}: ipaddr of this router
 *   subnet      {String}: subnet of weave network
 *   containerId {String}: id of container to add
 * @param  {Function} cb (err, stdout)
 */
function attach(options, cb) {
  if (!options ||
    typeof options.ipaddr !== 'string' ||
    typeof options.subnet !== 'string' ||
    typeof options.containerId !== 'string') {

    return cb(error.boom(400, 'invalid input', options));
  }

  var cmd = 'weave attach' +
    ' ' + options.ipaddr +
    '/' + options.subnet +
    ' ' + options.containerId;
  runCmd(cmd, handleErr(cb, 'attach failed', { cmd: cmd }));
}

/**
 * detach IP addr from container
 * @param  {Object}   options to pass into weave
 *   ipaddr      {String}: ipaddr of this router
 *   subnet      {String}: subnet of weave network
 *   containerId {String}: id of container to add
 * @param  {Function} cb (err, stdout)
 */
function detach(options, cb) {
  if (!options ||
    typeof options.ipaddr !== 'string' ||
    typeof options.subnet !== 'string' ||
    typeof options.containerId !== 'string') {

    return cb(error.boom(400, 'invalid input', options));
  }

  var cmd = 'weave detach' +
    ' ' + options.ipaddr +
    '/' + options.subnet +
    ' ' + options.containerId;

  runCmd(cmd, handleErr(cb, 'detach failed', { cmd: cmd }));
}


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

function handleErr (cb, message, errDebug) {
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

module.exports.launch = launch;
module.exports.status = status;
module.exports.attach = attach;
module.exports.detach = detach;
module.exports.setup = setup;