'use strict'
require('loadenv')()

var Code = require('code')
var Lab = require('lab')
var sinon = require('sinon')

var dockerEventStreamDisconnected = require('../../../lib/workers/docker.events-stream.disconnected.js')
var Docker = require('../../../lib/models/docker')
var RabbitMQ = require('../../../lib/models/rabbitmq')

var lab = exports.lab = Lab.script()
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var describe = lab.describe
var expect = Code.expect
var it = lab.it

describe('docker.events-stream.disconnected functional test', function () {
  beforeEach(function (done) {
    RabbitMQ._publisher = {
      publish: sinon.stub()
    }
    sinon.stub(Docker, 'doesDockExist')
    done()
  })

  afterEach(function (done) {
    Docker.doesDockExist.restore()
    done()
  })

  describe('docker stream disconnected', function () {
    var lightestDock = '10.1.1.1'
    var secondDock = '10.1.1.2'
    var randomDock = '10.1.1.3'
    var testGithibId = '12312312'

    beforeEach(function (done) {
      Docker.doesDockExist.yieldsAsync(null, false)
      done()
    })

    it('should publish weave peer remove on lightest dock', function (done) {
      var testHost = '10.0.0.2'
      var dockerHost = testHost + ':4242'
      var testUri = 'http://' + dockerHost
      var testJob = {
        host: testUri,
        org: testGithibId,
      }
      dockerEventStreamDisconnected(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.called(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, dockerHost, sinon.match.func)

        sinon.assert.called(RabbitMQ._publisher.publish)
        sinon.assert.calledWith(RabbitMQ._publisher.publish, 'weave.peer.remove', {
          dockerHost: lightestDock + ':4242',
          hostname: testHost,
          orgId: testGithibId
        })
        sinon.assert.neverCalledWith(RabbitMQ._publisher.publish, 'weave.peer.remove', {
          dockerHost: secondDock + ':4242',
          hostname: testHost
        })
        sinon.assert.neverCalledWith(RabbitMQ._publisher.publish, 'weave.peer.remove', {
          dockerHost: randomDock + ':4242',
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
        org: testGithibId,
      }
      dockerEventStreamDisconnected(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.called(Docker.doesDockExist)
        sinon.assert.calledWith(Docker.doesDockExist, dockerHost, sinon.match.func)

        sinon.assert.called(RabbitMQ._publisher.publish)
        sinon.assert.calledWith(RabbitMQ._publisher.publish, 'weave.peer.forget', {
          dockerHost: lightestDock + ':4242',
          hostname: testHost
        })
        sinon.assert.calledWith(RabbitMQ._publisher.publish, 'weave.peer.forget', {
          dockerHost: secondDock + ':4242',
          hostname: testHost
        })
        sinon.assert.neverCalledWith(RabbitMQ._publisher.publish, 'weave.peer.forget', {
          dockerHost: randomDock + ':4242',
          hostname: testHost
        })
        done()
      })
    })
  }) // weave container death
}) // end docker.events-stream.disconnected functional test
