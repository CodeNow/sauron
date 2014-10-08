'use strict';

require('./loadenv.js')();

var express = require('express');
var network = require('./routes/network.js');
var networkHosts = require('./routes/network-id-hosts.js');
var networkHostsActions = require('./routes/network-id-hosts-id-actions.js');

var app = express();

// Note:
//  networkIp is X.X.X in X.X.X.Y
//  hostIp is Y

/**
 * allocate a network for a group of containers
 * return: { networkIp: 'ip.ip.ip.ip' }
 */
app.post('networks', network.allocate);

/**
 * free a network
 * return: {}
 */
app.delete('networks/:networkIp', network.free);

/**
 * allocate an ip address for a host on given network
 * return: { hostIp: 'ip.ip.ip.ip' }
 */
app.post('networks/:networkIp/hosts', networkHosts.allocate);

/**
 * free an ip address for a host on given network
 * return: {}
 */
app.delete('networks/:networkIp/hosts/:hostIp', networkHosts.free);

/**
 * attach allocated host ip to a container
 * return: {}
 */
app.put('networks/:networkIp/hosts/:hostIp/actions/attach', networkHostsActions.attach);

/**
 * remove allocated host ip from a container
 * return: {}
 */
app.put('networks/:networkIp/hosts/:hostIp/actions/detach', networkHostsActions.detach);

module.exports = app;
