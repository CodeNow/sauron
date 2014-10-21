'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var error = require('../../lib/helpers/error.js');

lab.experiment('/lib/helpers/error.js unit test', function() {
  lab.experiment('error creation', function() {
    lab.test('error with no data', function(done) {
      var message = 'I did bad';
      var err = error.create(message);
      Lab.expect(err.message).to.equal(message);
      Lab.expect(err.stack).to.be.a('string');
      done();
    });
    lab.test('error with data', function(done) {
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
  lab.experiment('error logging', function() {
    lab.test('normal error', function(done) {
      error.log(new Error('error is good'));
      done();
    });
    lab.test('print error data', function(done) {
      process.env.LOG_ERRORS = 'yes';
      error.create('I should print', 'I am data');
      process.env.LOG_ERRORS = null;
      done();
    });
    lab.test('print error', function(done) {
      process.env.LOG_ERRORS = 'yes';
      error.create('I should print and i am alone');
      process.env.LOG_ERRORS = null;
      done();
    });
  });
  lab.experiment('errorResponder', function() {
    lab.test('should return 500 if 400 error', function(done) {
      error.errorResponder(new Error('the err'), null, {
        status: function(s) {
          Lab.expect(s).to.equal(500);
          return this;
        },
        json: function(s) {
          Lab.expect(s.message).to.equal('An internal server error occurred');
          return this;
        }
      });
      done();
    });
    lab.test('use orignal boom error', function(done) {
      var status = 444;
      var payload = 'much data';
      error.errorResponder(error.boom(status, payload, {stuff: 'extra'}), null, {
        status: function(s) {
          Lab.expect(s).to.equal(status);
          return this;
        },
        json: function(s) {
          Lab.expect(s.message).to.equal('much data');
          return this;
        }
      });
      done();
    });
    lab.test('should return 500 if 400 error with error print', function(done) {
      process.env.LOG_ERRORS = 'yes';
      error.errorResponder(new Error('the err'), null, {
        status: function(s) {
          Lab.expect(s).to.equal(500);
          return this;
        },
        json: function(s) {
          Lab.expect(s.message).to.equal('An internal server error occurred');
          return this;
        }
      });
      process.env.LOG_ERRORS = null;
      done();
    });

  });
});