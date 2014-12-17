'use strict';
require('./loadenv.js')();

var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var ipu = require('./helpers/ip-utils.js');
var error = require('./helpers/error.js');

var network = require('./routes/network.js');
var networkId = require('./routes/network-id.js');
var networkIdHosts = require('./routes/network-id-hosts.js');
var networkIdHostsId = require('./routes/network-id-hosts-id.js');
var networkIdHostsIdActions = require('./routes/network-id-hosts-id-actions.js');
var containersId = require('./routes/containers-id.js');
var envIs = require('101/env-is');

var app = express();

app.use(morgan('short', {
  skip: function () {
    // skip if env is test or LOG isnt true.
    return envIs('test') && process.env.LOG !== 'true';
  }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * allocate a network for a group of containers
 * return: { networkIp: 'ip.ip.ip.ip' }
 */
app.post('/networks', network.allocate);

app.all('/networks/:networkIp*', function(req, res, next) {
  if (!ipu.isValidIp(req.params.networkIp)) {
    return next(error.boom(400, 'malformed network ip'));
  }
  next();
});

/**
 * free a network
 * return: no content
 */
app.delete('/networks/:networkIp', networkId.free);

/**
 * allocate an ip address for a host on given network
 * return: { hostIp: 'ip.ip.ip.ip' }
 */
app.post('/networks/:networkIp/hosts', networkIdHosts.allocate);

app.all('/networks/:networkIp/hosts/:hostIp*', function(req, res, next) {
  if (!ipu.isValidIp(req.params.hostIp)) {
    return next(error.boom(400, 'malformed host ip'));
  }
  next();
});
/**
 * free an ip address for a host on given network
 * return: no content
 */
app.delete('/networks/:networkIp/hosts/:hostIp', networkIdHostsId.free);

/**
 * attach allocated host ip to a container
 * return: no content
 */
app.put('/networks/:networkIp/hosts/:hostIp/actions/attach', networkIdHostsIdActions.attach);

/**
 * remove allocated host ip from a container
 * return: no content
 */
app.put('/networks/:networkIp/hosts/:hostIp/actions/detach', networkIdHostsIdActions.detach);

/**
 * get ip address of container
 * return: { containerIp: 'ip.ip.ip.ip' }
 */
app.get('/containers/:containerId', containersId.getMapping);

// error handler
app.use(require('./helpers/error.js').errorResponder);

app.get('/', function (req, res) {
  res
    .status(200)
    .json({
      message: process.env.npm_package_description,
      git: process.env.npm_package_gitHead,
      config: process.env
    });
});

// catch all
app.all('*', function (req, res) {
  res
    .status(404)
    .json({
      message: 'route not implemented'
    });
});
module.exports = app;
