'use strict';
var which = require('which');
var async = require('async');
/*
  Sauron checks to see if its dependencies are installed, they currently are:
    weave
    ethtool
    conntrack
*/

function checkAllDeps(cb) {
  var deps = process.env.DEPENDENCIES.split(',');
  async.eachSeries(deps, which, cb);
}

module.exports = checkAllDeps;