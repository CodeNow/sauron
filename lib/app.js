'use strict';

require('./loadenv.js')();

var express = require('express');
var app = express();

// Note:
//  networkId is X.X.X in X.X.X.Y
//  hostId is Y

/**
 * allocate a network for a group of containers
 * @return {[type]} [description]
 */
app.post('networks', function () {

});

/**
 * free a network
 * @return {[type]} [description]
 */
app.delete('networks', function () {

});

/**
 * allocate an ip address for a host on given network
 * @return {[type]} [description]
 */
app.post('networks/:networkId/hosts', function () {

});

/**
 * free an ip address for a host on given network
 * @return {[type]} [description]
 */
app.delete('networks/:networkId/hosts/:hostId', function () {

});

/**
 * attach allocated host ip to a container
 * @return {[type]} [description]
 */
app.put('networks/:networkId/hosts/:hostId/actions/attach', function () {

});

/**
 * remove allocated host ip from a container
 * @return {[type]} [description]
 */
app.put('networks/:networkId/hosts/:hostId/actions/detach', function () {

});

module.exports = app;
