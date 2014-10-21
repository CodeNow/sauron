'use strict';
require('../../lib/loadenv.js')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var supertest = require('supertest');
var app = require('../../lib/app.js');

lab.experiment('misc test', function () {
  lab.experiment('GET /', function () {
    lab.test('should return info', function (done) {
      supertest(app)
        .get('/')
        .expect(200)
        .end(function (err, res) {
          if (err) { return done(err); }
          Lab.expect(res.body.message).to.equal(process.env.npm_package_description);
          Lab.expect(res.body.git).to.equal(process.env.npm_package_gitHead);
          Lab.expect(res.body.config).to.be.a('object');
          done();
        });
    });

    lab.test('should return 404', function (done) {
      supertest(app)
        .post('/fakeer')
        .expect(404, done);
    });
  });
}); // networks