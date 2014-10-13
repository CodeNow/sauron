'use strict';
require('../loadenv.js')();

var child_process = require('child_process');
var error = require('../helpers/error.js');


/* Current commands supported
  Usage:
  weave launch <ipaddr>/<subnet> [-password <password>] <peer_host> ...
  weave attach <ipaddr>/<subnet> <container_id>
  weave detach <ipaddr>/<subnet> <container_id>
  weave status
*/

function runCmd(cmd, cb) {
  child_process.exec(cmd, function (err, stdout, stderr) {
    if (err) {
      err.stderr = stderr;
    }
    return cb(err, stdout);
  });
}

/**
 * runs weave status
 * @param  {Function} cb callback with (err, out)
 */
function status (cb) {
  runCmd('sudo weave status', cb);
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
function launch (options, cb) {
  if (!options ||
    typeof options.ipaddr !== 'string' ||
    typeof options.subnet !== 'string' ||
    typeof options.password !== 'string' ||
    typeof options.peers !== 'object') {
    return cb(error.create('invalid input', options));
  }

  var cmd = 'sudo weave launch' +
    ' ' + options.ipaddr +
    '/' + options.subnet +
    ' -password ' + options.password;

  options.peers.forEach(function (item) {
    cmd += ' ' + item;
  });

  runCmd(cmd, cb);
}

/**
 * attach IP addr to container
 * @param  {Object}   options to pass into weave
 *   ipaddr      {String}: ipaddr of this router
 *   subnet      {String}: subnet of weave network
 *   containerId {String}: id of container to add
 * @param  {Function} cb (err, stdout)
 */
function attach (options, cb) {
  if (!options ||
    typeof options.ipaddr !== 'string' ||
    typeof options.subnet !== 'string' ||
    typeof options.containerId !== 'string') {

    return cb(error.create('invalid input', options));
  }

  var cmd = 'sudo weave attach' +
    ' ' + options.ipaddr +
    '/' + options.subnet +
    ' ' + options.containerId;

  runCmd(cmd, cb);
}

/**
 * detach IP addr from container
 * @param  {Object}   options to pass into weave
 *   ipaddr      {String}: ipaddr of this router
 *   subnet      {String}: subnet of weave network
 *   containerId {String}: id of container to add
 * @param  {Function} cb (err, stdout)
 */
function detach (options, cb) {
  if (!options ||
    typeof options.ipaddr !== 'string' ||
    typeof options.subnet !== 'string' ||
    typeof options.containerId !== 'string') {

    return cb(error.create('invalid input', options));
  }

  var cmd = 'sudo weave detach' +
    ' ' + options.ipaddr +
    '/' + options.subnet +
    ' ' + options.containerId;

  runCmd(cmd, cb);
}

module.exports.launch = launch;
module.exports.status = status;
module.exports.attach = attach;
module.exports.detach = detach;
module.exports.runCmd = runCmd;
