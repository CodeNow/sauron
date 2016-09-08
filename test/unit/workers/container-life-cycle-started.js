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
const containerLifeCycleStarted = require('../../../lib/workers/container-life-cycle-started.js').task

describe('container-life-cycle-started.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(Events, 'handleStartedAsync').resolves()
      done()
    })

    afterEach(function (done) {
      Events.handleStartedAsync.restore()
      done()
    })

    it('should throw error if handleStartedAsync failed', function (done) {
      Events.handleStartedAsync.rejects(new Error('test'))
      containerLifeCycleStarted({})
        .then(function () {
          throw new Error('should have thrown')
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(Error)
          done()
        })
    })

    it('should be fine if no errors', function (done) {
      containerLifeCycleStarted({})
        .then(function () {
          done()
        })
        .catch(done)
    })
  }) // end run
}) // end container-life-cycle-started
