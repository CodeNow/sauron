'use strict';
require('./loadenv.js')();

var express = require('express');
var network = require('./routes/network.js');
var networkId = require('./routes/network-id.js');
var networkIdHosts = require('./routes/network-id-hosts.js');
var networkIdHostsId = require('./routes/network-id-hosts-id.js');
var networkIdHostsIdActions = require('./routes/network-id-hosts-id-actions.js');

var app = express();

/**
 * allocate a network for a group of containers
 * return: { networkIp: 'ip.ip.ip.ip' }
 */
app.post('networks', network.allocate);

/**
 * free a network
 * return: no content
 */
app.delete('networks/:networkIp', networkId.free);

/**
 * allocate an ip address for a host on given network
 * return: { hostIp: 'ip.ip.ip.ip' }
 */
app.post('networks/:networkIp/hosts', networkIdHosts.allocate);

/**
 * free an ip address for a host on given network
 * return: no content
 */
app.delete('networks/:networkIp/hosts/:hostIp', networkIdHostsId.free);

/**
 * attach allocated host ip to a container
 * return: no content
 */
app.put('networks/:networkIp/hosts/:hostIp/actions/attach', networkIdHostsIdActions.attach);

/**
 * remove allocated host ip from a container
 * return: no content
 */
app.put('networks/:networkIp/hosts/:hostIp/actions/detach', networkIdHostsIdActions.detach);

module.exports = app;
