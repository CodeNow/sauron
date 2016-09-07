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

const Events = require('../../../lib/models/events.js')
const containerLifeCycleDied = require('../../../lib/workers/container-life-cycle-died.js').task

describe('container-life-cycle-died.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(Events, 'handleDied')
      done()
    })

    afterEach(function (done) {
      Events.handleDied.restore()
      done()
    })

    it('should throw error if handleDied throws', function (done) {
      Events.handleDied.throws(new Error('test'))
      containerLifeCycleDied({})
        .then(function () {
          throw new Error('should have thrown')
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(Error)
          done()
        })
    })

    it('should be fine if no errors', function (done) {
      Events.handleDied.returns()
      containerLifeCycleDied({})
        .then(function () {
          done()
        })
        .catch(done)
    })
  }) // end run
}) // end container-life-cycle-died unit test
