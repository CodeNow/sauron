'use strict';

var depcheck = require('./depcheck.js');
var network = require('./models/network.js');

// * Sauron checks to see if its dependencies are installed, they currently are:
//   * weave
//   * ethtool
//   * conntrack

// * Sauron check to see if weave is already running
//    * if running, start listening
//    * if not:
//      * query redis to see what ip's are in use
//      * use unused ip, networks should use 10.0.0.X and link to other hosts
//      * start listening

function startup (cb) {
  depcheck(function(err) {
    if (err) { return cb(err); }
    network.setup(cb);
  });
}

module.exports = startup;
