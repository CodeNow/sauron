'use strict'
require('loadenv')()

const RabbitMQ = require('ponos/lib/rabbitmq')
const uuid = require('uuid')
const joi = require('joi')
const log = require('../logger.js')()
const schemas = require('./schemas')

 /**
  * Rabbitmq internal singelton instance.
  * @type {rabbitmq}
  */
class Publisher extends RabbitMQ {
  constructor () {
    super({
      name: process.env.APP_NAME,
      hostname: process.env.RABBITMQ_HOSTNAME,
      port: process.env.RABBITMQ_PORT,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
      log: log.child({ module: 'publisher' }),
      tasks: [{
        name: 'weave.peer.remove',
        jobSchema: schemas.weavePeerRemove
      }, {
        name: 'weave.peer.forget',
        jobSchema: schemas.weavePeerForget
      }, {
        name: 'weave.kill',
        jobSchema: schemas.weaveKill
      }, {
        name: 'weave.start',
        jobSchema: schemas.weaveStart
      }],
      events: [{
        name: 'dock.lost',
        jobSchema: joi.object({
          host: joi.string().uri({ scheme: 'http' }).required(),
          githubOrgId: joi.number().required()
        }).unknown().required()
      }, {
        name: 'container.network.attached',
        jobSchema: joi.object({
          id: joi.string().required(),
          inspectData: joi.object({}).unknown().required(),
          containerIp: joi.string().required(),
          githubOrgId: joi.number().required()
        }).unknown().required()
      }]
    })
  }

  /**
   * publish container.network.attached
   * @param {Object} data data to pass to job
   */
  publishContainerNetworkAttached (data) {
    log.info({ data: data }, 'publishContainerNetworkAttached')
    this.publishEvent('container.network.attached', data)
  }

  /**
   * publish weave.start job
   * @param {Object} data data to pass to job
   */
  publishWeaveStart (data) {
    log.info({ data: data }, 'publishWeaveStart')
    this.publishTask('weave.start', data)
  }

  /**
   * publish weave.kill job
   * @param {Object} data data to pass to job
   */
  publishWeaveKill (data) {
    log.info({ data: data }, 'publishWeaveKill')
    this.publishTask('weave.kill', data)
  }

  /**
   * publish weave.peer.forget job
   * @param {Object} data data to pass to job
   */
  publishWeavePeerForget (data) {
    log.info({ data: data }, 'publishWeavePeerForget')
    this.publishTask('weave.peer.forget', data)
  }

  /**
   * publish weave.peer.remove job
   * @param {Object} data data to pass to job
   */
  publishWeavePeerRemove (data) {
    log.info({ data: data }, 'publishWeavePeerRemove')
    this.publishTask('weave.peer.remove', data)
  }

  /**
   * publish `dock.lost` event
   * @param  {object} data    data to publish to channel, should contain host and githubId
   */
  publishDockLost (data) {
    Object.assign(data, {
      timestamp: new Date(),
      dockerHealthCheckId: uuid()
    })
    log.info(data, 'publishDockLost')
    this.publishEvent('dock.lost', data)
  }
}

module.exports = new Publisher()
