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
const RabbitMQ = require('../../../lib/models/rabbitmq.js')
const ContainerLifeCycleDied = require('../../../lib/workers/container-life-cycle-died.js')
const containerLifeCycleDied = ContainerLifeCycleDied.task

describe('container-life-cycle-died.js unit test', function () {
  describe('#task', () => {
    beforeEach(function (done) {
      sinon.stub(ContainerLifeCycleDied, '_isWeaveContainer')
      sinon.stub(RabbitMQ, 'publishWeaveStart')
      done()
    })

    afterEach(function (done) {
      ContainerLifeCycleDied._isWeaveContainer.restore()
      RabbitMQ.publishWeaveStart.restore()
      done()
    })

    it('should publish start if weave container', function (done) {
      ContainerLifeCycleDied._isWeaveContainer.returns(true)
      RabbitMQ.publishWeaveStart.returns()

      containerLifeCycleDied({
        host: 'ras',
        tags: 'tag,me',
        from: 'weaveworks/weave'
      })
      .tap(() => {
        expect(RabbitMQ.publishWeaveStart.calledOnce).to.be.true()
      })
      .asCallback(done)
    })

    it('should not publish start', function (done) {
      ContainerLifeCycleDied._isWeaveContainer.returns(false)

      containerLifeCycleDied({})
      .tap(() => {
        expect(RabbitMQ.publishWeaveStart.calledOnce).to.be.false()
      })
      .asCallback(done)
    })
  })

  describe('_isWeaveContainer', function () {
    it('should return true if correct container', function (done) {
      const testData = {
        from: 'weaveworks/weave'
      }
      expect(ContainerLifeCycleDied._isWeaveContainer(testData)).to.be.true()
      done()
    })

    it('should return false if wrong container', function (done) {
      const testData = {
        from: 'wrong'
      }
      expect(ContainerLifeCycleDied._isWeaveContainer(testData)).to.be.false()
      done()
    })

    it('should return false if from is null', function (done) {
      const testData = {
        from: null
      }
      expect(ContainerLifeCycleDied._isWeaveContainer(testData)).to.be.false()
      done()
    })
  }) // end _isWeaveContainer
}) // end container-life-cycle-died unit test
