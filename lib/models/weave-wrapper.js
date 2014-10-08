'use strict';
require('../loadenv.js')();

var exec = require('child_process').exec;
var error = require('../error.js');


/* Current commands supported
  Usage:
  weave launch <ipaddr>/<subnet> [-password <password>] <peer_host> ...
  weave attach <ipaddr>/<subnet> <container_id>
  weave detach <ipaddr>/<subnet> <container_id>
  weave status
*/

function runCmd(cmd, cb) {
  exec(cmd, function (err, stdout, stderr) {
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
  runCmd('weave status', cb);
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
  if (options &&
    typeof options.ipaddr === 'string' &&
    typeof options.subnet === 'string' &&
    typeof options.password === 'string' &&
    typeof options.peers === 'object') {
    return cb(error.create('invalid input', options));
  }

  var cmd = 'weave launch' +
    ' ' + options.ipaddr +
    '/' + options.subnet +
    '-password ' + options.password;

  options.peers.forEach(function(item) {
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
  if (options &&
    typeof options.ipaddr === 'string' &&
    typeof options.subnet === 'string' &&
    typeof options.containerId === 'string') {
    return cb(error.create('invalid input', options));
  }

  var cmd = 'weave attach' +
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
  if (options &&
    typeof options.ipaddr === 'string' &&
    typeof options.subnet === 'string' &&
    typeof options.containerId === 'string') {
    return cb(error.create('invalid input', options));
  }

  var cmd = 'weave detach' +
    ' ' + options.ipaddr +
    '/' + options.subnet +
    ' ' + options.containerId;

  runCmd(cmd, cb);
}

module.exports.launch = launch;
module.exports.status = status;
module.exports.attach = attach;
module.exports.detach = detach;
