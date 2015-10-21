'use strict';
require('./loadenv.js')();

var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var envIs = require('101/env-is');

var containerIdActions = require('./middleware/containers-id-actions.js');

var app = express();

app.use(morgan('short', {
  skip: function () {
    // skip if env is test or LOG isnt true.
    return envIs('test') || process.env.LOG !== 'true';
  }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * attach allocated host ip to a container
 * return: no content
 */
app.put('/containers/:containerId/actions/attach', containerIdActions.attach);

/**
 * remove allocated host ip from a container
 * return: no content
 */
app.put('/containers/:containerId/actions/detach', containerIdActions.detach);

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
