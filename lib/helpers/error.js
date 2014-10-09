'use strict';
require('../loadenv.js')();

var Boom = require('boom');

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

function boom (code, msg, data) {
  return Boom.create(code, msg, data);
}

module.exports.create = create;
module.exports.log = log;
module.exports.boom = boom;
