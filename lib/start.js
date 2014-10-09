'use strict';

var depcheck = require('./helpers/depcheck.js');
var weaver = require('./models/weaver.js');
var network = require('./models/network.js');

function startup (cb) {
  depcheck(function(err) {
    if (err) { return cb(err); }
    network.initRouters(function(err){
      if (err) { return cb(err); }
      weaver.setup(cb);
    });
  });
}

module.exports = startup;
