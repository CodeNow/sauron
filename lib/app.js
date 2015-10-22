'use strict';
require('loadenv')();

var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');

var containerIdActions = require('./middleware/containers-id-actions.js');

var app = express();

app.use(morgan('short'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * attach allocated host ip to a container
 * return: { hostIp: '10.0.0.0' }
 */
app.put('/containers/:containerId/actions/attach', containerIdActions.attach);

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
