'use strict'
require('loadenv')()

var Code = require('code')
var Docker = require('dockerode')
var fs = require('fs')
var Lab = require('lab')
var path = require('path')
var sinon = require('sinon')

var RabbitMQ = require('../../../lib/models/rabbitmq.js')
var swarmInfo = require('../../fixtures/swarm-info-dynamic');
var weavePeerForget = require('../../../lib/workers/weave.peer.forget.js')

var lab = exports.lab = Lab.script()
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var describe = lab.describe
var expect = Code.expect
var it = lab.it

describe('weave.peer.forget functional test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_PATH = path.resolve(__dirname, '../../fixtures/weaveMock');
    sinon.stub(Docker.prototype, 'info')
    fs.unlink('./weaveMockArgs', function () {
      fs.unlink('./weaveEnvs', function () {
        done();
      });
    });
  })

  afterEach(function (done) {
    Docker.prototype.info.restore()
    delete process.env.WEAVE_PATH
    done()
  })

  describe('normal job', function () {
    var testDockIp = '10.0.0.2'
    var testRmDock = '10.0.0.3'
    beforeEach(function (done) {
      Docker.prototype.info.yieldsAsync(null, swarmInfo([{
        ip: testDockIp,
        org: '12345125'
      }, {
        ip: testRmDock,
        org: '12345125'
      }, {
        ip: testDockIp,
        org: 'fake'
      }]))
      done()
    })

    it('should call forget with right peer', function (done) {
      var testDockerHost = testDockIp + ':4242'
      var testJob = {
        dockerHost: testDockerHost,
        hostname: testRmDock
      }

      weavePeerForget(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.calledOnce(Docker.prototype.info)
        sinon.assert.calledWith(Docker.prototype.info, sinon.match.func)

        var weaveArgs = fs.readFileSync('./weaveMockArgs');
        var weaveEnvs = fs.readFileSync('./weaveEnvs');

        expect(weaveArgs.toString()).to.equal('forget ' + testRmDock + '\n');
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=' + testDockIp + ':4242');
        done()
      })
    }) // end should launch weave
  }) // end normal job
}) // end weave.peer.forget functional test