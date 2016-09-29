'use strict'
require('loadenv')()

const Lab = require('lab')
const sinon = require('sinon')
const Promise = require('bluebird')
require('sinon-as-promised')(Promise)
const dockerEventStreamDisconnected = require('../../../lib/workers/docker.events-stream.disconnected.js').task
const Swarm = require('../../../lib/models/swarm')
const RabbitMQ = require('../../../lib/models/rabbitmq')

const lab = exports.lab = Lab.script()
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const it = lab.it

describe('docker.events-stream.disconnected functional test', function () {
  beforeEach(function (done) {
    sinon.stub(RabbitMQ, 'publishTask')
    sinon.stub(Swarm, 'doesDockExist')
    sinon.stub(Swarm, 'findLightestOrgDock')
    sinon.stub(Swarm, 'findDocksByOrgId')
    done()
  })

  afterEach(function (done) {
    RabbitMQ.publishTask.restore()
    Swarm.doesDockExist.restore()
    Swarm.findLightestOrgDock.restore()
    Swarm.findDocksByOrgId.restore()
    done()
  })

  describe('docker stream disconnected', function () {
    var lightestDock = '10.1.1.1:4242'
    var secondDock = '10.1.1.2:4242'
    var randomDock = '10.1.1.3:4242'
    var testGithibId = '12312312'

    beforeEach(function (done) {
      Swarm.doesDockExist.resolves(false)
      Swarm.findLightestOrgDock.yieldsAsync(null, { Host: lightestDock })
      Swarm.findDocksByOrgId.yieldsAsync(null, [
        { Host: lightestDock },
        { Host: secondDock }
      ])
      done()
    })

    it('should publish weave peer remove on lightest dock', function (done) {
      var testHost = '10.0.0.2'
      var dockerHost = testHost + ':4242'
      var testUri = 'http://' + dockerHost
      var testJob = {
        host: testUri,
        org: testGithibId
      }
      dockerEventStreamDisconnected(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.called(Swarm.doesDockExist)
        sinon.assert.calledWith(Swarm.doesDockExist)

        sinon.assert.called(RabbitMQ.publishTask)
        sinon.assert.calledWith(RabbitMQ.publishTask, 'weave.peer.remove', {
          dockerHost: lightestDock,
          hostname: testHost,
          orgId: testGithibId
        })
        sinon.assert.neverCalledWith(RabbitMQ.publishTask, 'weave.peer.remove', {
          dockerHost: secondDock,
          hostname: testHost
        })
        sinon.assert.neverCalledWith(RabbitMQ.publishTask, 'weave.peer.remove', {
          dockerHost: randomDock,
          hostname: testHost
        })
        done()
      })
    })

    it('should publish weave peer forget on all orgs docks', function (done) {
      var testHost = '10.0.0.2'
      var dockerHost = testHost + ':4242'
      var testUri = 'http://' + dockerHost
      var testJob = {
        host: testUri,
        org: testGithibId
      }
      dockerEventStreamDisconnected(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.called(Swarm.doesDockExist)
        sinon.assert.calledWith(Swarm.doesDockExist, dockerHost)

        sinon.assert.called(RabbitMQ.publishTask)
        sinon.assert.calledWith(RabbitMQ.publishTask, 'weave.peer.forget', {
          dockerHost: lightestDock,
          hostname: testHost
        })
        sinon.assert.calledWith(RabbitMQ.publishTask, 'weave.peer.forget', {
          dockerHost: secondDock,
          hostname: testHost
        })
        sinon.assert.neverCalledWith(RabbitMQ.publishTask, 'weave.peer.forget', {
          dockerHost: randomDock,
          hostname: testHost
        })
        done()
      })
    })
  }) // weave container death
}) // end docker.events-stream.disconnected functional test
