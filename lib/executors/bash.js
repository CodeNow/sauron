'use strict';

var child_process = require('child_process');

module.exports = function (cmd, cb) {
  child_process.exec(cmd, function (err, stdout, stderr) {
    if (err) {
      err.stderr = stderr;
    }
    return cb(err, stdout);
  });
};
