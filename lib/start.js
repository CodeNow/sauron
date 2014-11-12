'use strict';

var depcheck = require('./helpers/depcheck.js');
var weaver = require('./models/weaver.js');

function startup (cb) {
  depcheck(function (err) {
    if (err) { return cb(err); }
    weaver.setup(function(err) {
      if (err) {
        if (err.message !== 'container already started') {
          return cb(err);
        }
      }
      return cb();
    });
  });
}

module.exports = startup;
