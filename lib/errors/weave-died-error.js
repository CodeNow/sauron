'use strict';

var util = require('util');
var ErrorCat = require('error-cat');
var error = new ErrorCat();
var ip = require('ip');

/**
 * Error type that weave container died
 * @class
 * @param {object} data Additional data for the error
 */
function WeaveDiedError (data) {
  Error.call(this);
  this.message= 'weave container died';
  this.data = error.create(500, 'weave died', {
     host: ip.address(),
     data: data
   });
}
util.inherits(WeaveDiedError, Error);

/**
 * Fatal error that indicates the weave container died
 * @module sauron:errors
 */
module.exports = WeaveDiedError;
