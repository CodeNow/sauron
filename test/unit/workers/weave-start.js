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
const weaveStart = require('../../../lib/workers/weave-start.js').task

describe('weave-start.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(Events, 'handleStartAsync').resolves()
      done()
    })

    afterEach(function (done) {
      Events.handleStartAsync.restore()
      done()
    })

    it('should throw error if setup failed', function (done) {
      Events.handleStartAsync.rejects(new Error('test'))
      weaveStart({})
        .then(function () {
          throw new Error('should have thrown')
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(Error)
          done()
        })
    })

    it('should be fine if no errors', function (done) {
      weaveStart({
        dockerUri: '10.0.0.1:4224',
        orgId: 'runnable'
      })
      .asCallback(done)
    })
  }) // end run
}) // end weave-start
