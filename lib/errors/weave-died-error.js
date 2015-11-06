'use strict';

var util = require('util');

/**
 * Error type that weave container died
 * @class
 * @param {string} queue Name of the queue that encountered the error.
 * @param {string} message Message for the error.
 * @param {object} [data] Additional data for the error, optional.
 */
function WeaveDiedError (err) {
  Error.call(this);
  this.message= 'weave container died';
  this.data = err;
}
util.inherits(WeaveDiedError, Error);

/**
 * Fatal error that indicates the weave container died
 * @module ponos:errors
 */
module.exports = WeaveDiedError;
