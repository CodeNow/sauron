'use strict';
var which = require('which');
var async = require('async');
/*
* Sauron checks to see if its dependencies are installed, they currently are:
  * weave
  * ethtool
  * conntrack
*/

function checkDep(bin) {
  return function (cb) {
    which(bin, cb);
  };
}

function checkAllDeps(cb) {
  async.parallel([
    checkDep('weave'),
    checkDep('ethtool'),
    checkDep('conntrack')
  ], cb);
}

module.exports = checkAllDeps;