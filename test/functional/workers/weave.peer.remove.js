'use strict'
require('loadenv')()

var Code = require('code')
var fs = require('fs')
var Lab = require('lab')
var path = require('path')
var sinon = require('sinon')
var Promise = require('bluebird')
require('sinon-as-promised')(Promise)

var Docker = require('../../../lib/models/docker')
var weavePeerRemove = require('../../../lib/workers/weave.peer.remove.js').task

var lab = exports.lab = Lab.script()
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var describe = lab.describe
var expect = Code.expect
var it = lab.it

describe('weave.peer.remove functional test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_PATH = path.resolve(__dirname, '../../fixtures/weaveMock')
    sinon.stub(Docker, 'doesDockExist')
    fs.unlink('./weaveMockArgs', function () {
      fs.unlink('./weaveEnvs', function () {
        done()
      })
    })
  })

  afterEach(function (done) {
    Docker.doesDockExist.restore()
    delete process.env.WEAVE_PATH
    done()
  })

  describe('normal job', function () {
    var testDockIp = '10.0.0.2'
    var testRmDock = '10.0.0.3'
    beforeEach(function (done) {
      Docker.doesDockExist.resolves(true)
      done()
    })

    it('should call rmpeer', function (done) {
      var testDockerHost = testDockIp + ':4242'
      var testJob = {
        dockerHost: testDockerHost,
        hostname: testRmDock,
        orgId: '1235123'
      }

      weavePeerRemove(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.calledOnce(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, testDockerHost)

        var weaveArgs = fs.readFileSync('./weaveMockArgs')
        var weaveEnvs = fs.readFileSync('./weaveEnvs')
        var ipNickname = 'ip-' + testRmDock.replace(/\./g, '-') + '.' + testJob.orgId
        expect(weaveArgs.toString()).to.equal('rmpeer ' + ipNickname + '\n')
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1')
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH)
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=' + testDockIp + ':4242')
        done()
      })
    }) // end should call rmpeer
  }) // end normal job
}) // end weave.peer.remove functional test
