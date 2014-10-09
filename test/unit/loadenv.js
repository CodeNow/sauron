'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();

lab.experiment('loadenv.js unit test', function () {
  lab.experiment('basic', function () {
    lab.test('load 2 times', function (done) {
      var loadenv = require('../../lib/loadenv.js');
      loadenv();
      loadenv();
      done();
    });
  });
});
