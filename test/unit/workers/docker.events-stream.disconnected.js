'use strict'
require('loadenv')()

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const Code = require('code')
const expect = Code.expect

const sinon = require('sinon')
require('sinon-as-promised')(require('bluebird'))

const Events = require('../../../lib/models/events.js')
const dockerEventsStreamDisconnected = require('../../../lib/workers/docker.events-stream.disconnected.js').task

describe('docker.events-stream.disconnected.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(Events, 'handleDockerEventStreamDisconnectedAsync').resolves()
      done()
    })

    afterEach(function (done) {
      Events.handleDockerEventStreamDisconnectedAsync.restore()
      done()
    })

    it('should be fine if no errors', function (done) {
      dockerEventsStreamDisconnected({
        host: 'http://10.0.0.1:4224',
        org: '12345'
      })
      .asCallback(done)
    })

    it('should throw error if setup failed', function (done) {
      Events.handleDockerEventStreamDisconnectedAsync.rejects(new Error('test'))
      dockerEventsStreamDisconnected({
        host: 'http://10.0.0.1:4224',
        org: '12345'
      })
      .asCallback(function (err) {
        expect(err).to.be.instanceOf(Error)
        done()
      })
    })
  }) // end run
}) // end docker.events-stream.disconnected
