'use strict';

require('./loadenv.js')();

var express = require('express');
var app = express();

// Note: networkId is X.X in 10.X.X.102
//
//

app.post('networks', function () {

});

app.post('networks/:networkId/hosts', function () {

});

app.delete('networks/:networkId/hosts/:hostId', function () {

});

app.put('networks/:networkId/hosts/:hostId/actions/attach', function () {

});

app.put('networks/:networkId/hosts/:hostId/actions/detach', function () {

});

module.exports = app;
