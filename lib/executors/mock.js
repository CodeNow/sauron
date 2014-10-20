'use strict';

var mock = function (cmd, cb) {
  return cb(null, cmd);
};

var current = mock;

module.exports = function() {
  current.apply(null, arguments);
};


module.exports.set = function(fn) {
  current = fn;
};

module.exports.reset = function() {
  current = mock;
};