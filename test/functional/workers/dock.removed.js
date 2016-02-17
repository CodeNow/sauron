'use strict'
require('loadenv')()

var Code = require('code')
var Docker = require('dockerode')
var Lab = require('lab')
var sinon = require('sinon')

var dockRemoved = require('../../../lib/workers/dock.removed.js')
var RabbitMQ = require('../../../lib/models/rabbitmq.js')
var swarmInfo = require('../../fixtures/swarm-info-dynamic');

var lab = exports.lab = Lab.script()
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var describe = lab.describe
var expect = Code.expect
var it = lab.it

describe('dock.removed functional test', function () {
  beforeEach(function (done) {
    RabbitMQ._publisher = {
      publish: sinon.stub()
    }
    sinon.stub(Docker.prototype, 'info')
    done()
  })

  afterEach(function (done) {
    Docker.prototype.info.restore()
    done()
  })

  describe('normal dock removed', function () {
    var lightestDock = '10.1.1.1'
    var secondDock = '10.1.1.2'
    var testGithibId = '12312312'

    beforeEach(function (done) {
      Docker.prototype.info.yieldsAsync(null, swarmInfo([{
        ip: secondDock,
        numContainers: 9,
        org: testGithibId
      }, {
        ip: lightestDock,
        numContainers: 2,
        org: testGithibId
      }, {
        ip: '10.1.1.3',
        numContainers: 1,
        org: 'badOrg'
      }]))
      done()
    })

    it('should publish weave peer remove on lightest dock', function (done) {
      var testHost = '10.0.0.2'
      var testUri = 'http://' + testHost + ':4242'
      var testJob = {
        host: testUri,
        githubId: testGithibId,
      }
      dockRemoved(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.called(Docker.prototype.info)
        sinon.assert.calledWith(Docker.prototype.info, sinon.match.func)

        sinon.assert.called(RabbitMQ._publisher.publish)
        sinon.assert.calledWith(RabbitMQ._publisher.publish, 'weave.peer.remove', {
          dockerHost: lightestDock + ':4242',
          hostname: testHost
        })
        done()
      })
    })

   it('should publish weave peer forget on all orgs docks', function (done) {
      var testHost = '10.0.0.2'
      var testUri = 'http://' + testHost + ':4242'
      var testJob = {
        host: testUri,
        githubId: testGithibId,
      }
      dockRemoved(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.called(Docker.prototype.info)
        sinon.assert.calledWith(Docker.prototype.info, sinon.match.func)

        sinon.assert.called(RabbitMQ._publisher.publish)
        sinon.assert.calledWith(RabbitMQ._publisher.publish, 'weave.peer.forget', {
          dockerHost: lightestDock + ':4242',
          hostname: testHost
        })
        sinon.assert.calledWith(RabbitMQ._publisher.publish, 'weave.peer.forget', {
          dockerHost: secondDock + ':4242',
          hostname: testHost
        })
        done()
      })
    })
  }) // weave container death
}) // end dock.removed functional test