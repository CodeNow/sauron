'use strict'
require('loadenv')()

const Code = require('code')
const fs = require('fs')
const Lab = require('lab')
const path = require('path')
const sinon = require('sinon')
const Promise = require('bluebird')
require('sinon-as-promised')(Promise)

const Swarm = require('../../../lib/models/swarm')
const weavePeerForget = require('../../../lib/workers/weave.peer.forget.js').task

const lab = exports.lab = Lab.script()
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const expect = Code.expect
const it = lab.it

describe('weave.peer.forget functional test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_PATH = path.resolve(__dirname, '../../fixtures/weaveMock')
    sinon.stub(Swarm, 'doesDockExist')
    fs.unlink('./weaveMockArgs', function () {
      fs.unlink('./weaveEnvs', function () {
        done()
      })
    })
  })

  afterEach(function (done) {
    Swarm.doesDockExist.restore()
    delete process.env.WEAVE_PATH
    done()
  })

  describe('normal job', function () {
    var testDockIp = '10.0.0.2'
    var testRmDock = '10.0.0.3'
    beforeEach(function (done) {
      Swarm.doesDockExist.resolves(true)
      done()
    })

    it('should call forget with right peer', function (done) {
      var testSwarmHost = testDockIp + ':4242'
      var testJob = {
        dockerHost: testSwarmHost,
        hostname: testRmDock
      }

      weavePeerForget(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.calledOnce(Swarm.doesDockExist)
        sinon.assert.calledWith(Swarm.doesDockExist, testSwarmHost)

        var weaveArgs = fs.readFileSync('./weaveMockArgs')
        var weaveEnvs = fs.readFileSync('./weaveEnvs')

        expect(weaveArgs.toString()).to.equal('forget ' + testRmDock + '\n')
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1')
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH)
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=' + testDockIp + ':4242')
        done()
      })
    }) // end should launch weave
  }) // end normal job
}) // end weave.peer.forget functional test
