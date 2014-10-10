'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var error = require('../../lib/helpers/error.js');

lab.experiment('/lib/helpers/error.js unit test', function () {
  lab.experiment('error creation', function () {
    lab.test('error with no data', function (done) {
      var message = 'I did bad';
      var err = error.create(message);
      Lab.expect(err.message).to.equal(message);
      Lab.expect(err.stack).to.be.a('string');
      done();
    });
    lab.test('error with data', function (done) {
      var message = 'I broke it';
      var data = {
        stuff: 'is stuff'
      };
      var err = error.create(message, data);
      Lab.expect(err.data).to.equal(data);
      Lab.expect(err.message).to.equal(message);
      Lab.expect(err.stack).to.be.a('string');
      done();
    });
  });
  lab.experiment('error logging', function () {
    lab.test('normal error', function (done) {
      error.log(new Error('error is good'));
      done();
    });
    lab.test('print error data', function (done) {
      process.env.NODE_ENV = '';
      error.create('I should print', 'I am data');
      process.env.NODE_ENV = 'test';
      done();
    });
    lab.test('print error', function (done) {
      process.env.NODE_ENV = '';
      error.create('I should print and i am alone');
      process.env.NODE_ENV = 'test';
      done();
    });
  });
});
