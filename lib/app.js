'use strict';
require('loadenv')();

var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var ErrorCat = require('error-cat');

var containerIdActions = require('./middleware/containers-id-actions.js');
var basePaths = require('./middleware/base-paths.js');

var app = express();

app.use(morgan('short'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * attach allocated host ip to a container
 * return: { containerIp: '10.0.0.0' }
 */
app.put('/containers/:containerId/actions/attach', containerIdActions.attach);

app.use(ErrorCat.middleware);

app.get('/', basePaths.root);
app.all('*', basePaths.all);

module.exports = app;
