'use strict';
require('../loadenv.js')();

function create(message, data) {
  var err = new Error(message);
  err.data = data;
  log(err);
  return err;
}

function log (err) {
  console.error(err.message);
  console.error(err.stack);
  if (err.data) {
    console.error(err.data);
  }
}

module.exports.create = create;
module.exports.log = log;
