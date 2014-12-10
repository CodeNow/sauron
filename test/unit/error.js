'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var error = require('../../lib/helpers/error.js');
var noop = require('101/noop');
var rollbar = require('rollbar');

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
          Lab.expect(s.message).to.equal('the err');
          Lab.expect(s.error).to.equal('Internal Server Error');
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
    lab.test('should return 500 with err.message if error', function(done) {
      process.env.LOG_ERRORS = 'yes';
      error.errorResponder(new Error('the err'), null, {
        status: function(s) {
          Lab.expect(s).to.equal(500);
          return this;
        },
        json: function(s) {
          Lab.expect(s.message).to.equal('the err');
          Lab.expect(s.error).to.equal('Internal Server Error');
          return this;
        }
      });
      process.env.LOG_ERRORS = null;
      done();
    });
    lab.test('should return 500 if primitive error', function(done) {
      error.errorResponder(1235678, null, {
        status: function(s) {
          Lab.expect(s).to.equal(500);
          return this;
        },
        json: function(s) {
          Lab.expect(s.message).to.equal(1235678);
          Lab.expect(s.error).to.equal('Internal Server Error');
          return this;
        }
      });
      done();
    });
    lab.experiment('non-test env', function() {
      var env;
      var handleErrorWithPayloadData;
      lab.beforeEach(function (done) {
        env = process.env.NODE_ENV;
        handleErrorWithPayloadData = rollbar.handleErrorWithPayloadData;
        process.env.NODE_ENV = 'staging'; // set env to not be test
        rollbar.handleErrorWithPayloadData = noop; // to be safe
        done();
      });
      lab.afterEach(function (done) {
        process.env.NODE_ENV = env; // restore env
        rollbar.handleErrorWithPayloadData = handleErrorWithPayloadData; // restore method
        done();
      });
      lab.test('random error causes report to be called', function (done) {
        var err = new Error('test');
        var mockRes = {
          status: function () {
            return this;
          },
          json: noop,
        };
        rollbar.handleErrorWithPayloadData = function (error) {
          Lab.expect(error.message).to.equal(err.message);
          done(); // make sure report is called
        };
        error.errorResponder(err, null, mockRes, null);
      });
    });
  }); // errorResponder
});