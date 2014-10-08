'use strict';
require('./loadenv.js')();

function create(message, data) {
  var err = new Error(message);
  err.data = data;
  return err;
}

module.exports.create = create;
