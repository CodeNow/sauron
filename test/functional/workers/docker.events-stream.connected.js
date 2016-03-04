'use strict'
require('loadenv')()

var Code = require('code')
var Docker = require('dockerode')
var Lab = require('lab')
var sinon = require('sinon')

var dockerEventsStreamConnected = require('../../../lib/workers/docker.events-stream.connected.js')
var RabbitMQ = require('../../../lib/models/rabbitmq.js')
var swarmInfo = require('../../fixtures/swarm-info-dynamic');

var lab = exports.lab = Lab.script()
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var describe = lab.describe
var expect = Code.expect
var it = lab.it

describe('docker.events-stream.connected functional test', function () {
  beforeEach(function (done) {
    RabbitMQ._publisher = {
      publish: sinon.stub()
    }
    done()
  })

  describe('normal job', function () {
    it('should publish weave start', function (done) {
      var testHost = 'http://10.0.0.2:4242'
      var testOrg = '12345125'
      var testJob = {
        host: testHost,
        tags: testOrg + ',run,build'
      }

      dockerEventsStreamConnected(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.called(RabbitMQ._publisher.publish)
        sinon.assert.calledWith(RabbitMQ._publisher.publish, 'weave.start', {
          dockerUri: testHost,
          orgId: testOrg
        })
        done()
      })
    })
  }) // end normal job
}) // end docker.events-stream.connected functional test