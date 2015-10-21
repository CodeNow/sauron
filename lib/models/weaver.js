'use strict';
require('../loadenv.js')();

var weave = require('../engines/weave-wrapper.js');

/**
 * setup weave network on the box and add it to global weave network
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
function setup (cb) {
  var options = {
    password: process.env.WEAVE_PASSWORD
  };

  // launch router on this host
  weave.launch(options, function (err) {
    // ignore already started err
    if (err && !isAlreadyLaunchedErr(err)) {
      return cb(err);
    }
  });

  function isAlreadyLaunchedErr(err) {
    if (err.data && err.data.err) {
      return /weave is already running/.test(err.data.err);
    }
    return false;
  }
}

/**
 * add container network
 * @param  'String'   containerId id of container
 * @param  {Function} cb          (err, containerId)
 */
function attachContainer (containerId, cb) {
  var options = {
    containerId: containerId
  };

  weave.attach(options, cb);
}

/**
 * remove container from org network
 * @param  'String'   containerId id of container
 * @param  'String'   ipAddr      ip addr to detach
 * @param  'String'   cidr        cidr value
 * @param  boolean    force       ignore mapping errors
 * @param  {Function} cb          (err)
 */
function detachContainer (containerId, cb) {
  var options = {
    containerId: containerId,
  };

  weave.detach(options, cb);
}


module.exports.setup = setup;
module.exports.attachContainer = attachContainer;
module.exports.detachContainer = detachContainer;