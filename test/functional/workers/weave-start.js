'use strict'
require('loadenv')()

var Code = require('code')
var Swarm = require('@runnable/loki').Swarm
var fs = require('fs')
var Lab = require('lab')
var path = require('path')
var sinon = require('sinon')
const Swarmerode = require('swarmerode')._Swarmerode

var RabbitMQ = require('../../../lib/models/rabbitmq.js')
var swarmInfo = require('../../fixtures/swarm-info-dynamic');
var weaveStart = require('../../../lib/workers/weave-start.js')

var lab = exports.lab = Lab.script()
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var describe = lab.describe
var expect = Code.expect
var it = lab.it

describe('weave-start functional test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_PATH = path.resolve(__dirname, '../../fixtures/weaveMock');
    sinon.stub(Swarm.prototype, 'swarmInfo')
    fs.unlink('./weaveMockArgs', function () {
      fs.unlink('./weaveEnvs', function () {
        done();
      });
    });
  })

  afterEach(function (done) {
    Swarm.prototype.swarmInfo.restore()
    delete process.env.WEAVE_PATH
    done()
  })

  describe('normal job', function () {
    var testDockIp = '10.0.0.2'
    var testDockIp2 = '10.0.0.3'
    var testDockIp3 = '10.0.0.4'
    beforeEach(function (done) {
      const swarmInfoData = swarmInfo([{
        ip: testDockIp,
        org: '12345125'
      }, {
        ip: testDockIp2,
        org: '12345125'
      }, {
        ip: testDockIp3,
        org: 'fake'
      }])
      swarmInfoData.parsedSystemStatus = Swarmerode._parseSwarmSystemStatus(swarmInfoData.SystemStatus)
      Swarm.prototype.swarmInfo.yieldsAsync(null, swarmInfoData)
      done()
    })

    it('should launch weave', function (done) {
      var testDockerUri = 'http://' + testDockIp + ':4242'
      var testOrg = '12345125'
      var testJob = {
        dockerUri: testDockerUri,
        orgId: testOrg
      }

      weaveStart(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.calledOnce(Swarm.prototype.swarmInfo)
        sinon.assert.calledWith(Swarm.prototype.swarmInfo, sinon.match.func)

        var weaveArgs = fs.readFileSync('./weaveMockArgs');
        var weaveEnvs = fs.readFileSync('./weaveEnvs');

        expect(weaveArgs.toString()).to.equal('launch-router --no-dns --ipalloc-range 10.21.0.0/16 --ipalloc-default-subnet 10.21.0.0/16 ' + testDockIp2 + '\n');
        expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
        expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
        expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=' + testDockIp + ':4242');
        done()
      })
    })
  }) // end should launch weave
}) // end weave-start functional test
