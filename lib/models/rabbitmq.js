'use strict'
require('loadenv')()

const RabbitMQ = require('ponos/lib/rabbitmq')
const uuid = require('uuid')
const joi = require('joi')
const log = require('../logger.js')()

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
      tasks: [{
        name: 'dock.lost',
        jobSchema: joi.object({
          host: joi.string().required()
        }).unknown().required()
      }, {
        name: 'weave.peer.remove',
        jobSchema: require('../workers/weave.peer.remove').jobSchema
      }, {
        name: 'weave.peer.forget',
        jobSchema: require('../workers/weave.peer.forget').jobSchema
      }, {
        name: 'weave.kill',
        jobSchema: require('../workers/weave.kill').jobSchema
      }, {
        name: 'weave.start',
        jobSchema: require('../workers/weave-start').jobSchema
      }],
      events: [{
        name: 'container.network.attached',
        jobSchema: joi.object({
          id: joi.string().required(),
          inspectData: joi.object().unknown().required(),
          containerIp: joi.string().required()
        }).unknown().required()
      }]
    })
  }

  /**
   * publish container.network.attached
   * @param {Object} data data to pass to job
   * @throws {Error} If missing data
   */
  publishContainerNetworkAttached (data) {
    log.info({ data: data }, 'publisher.publishContainerNetworkAttached')
    this.publishEvent('container.network.attached', data)
  }

  /**
   * publish weave.start job
   * @param {Object} data data to pass to job
   */
  publishWeaveStart (data) {
    log.info({ data: data }, 'publisher.publishWeaveStart')
    this.publishTask('weave.start', data)
  }

  /**
   * publish weave.kill job
   * @param {Object} data data to pass to job
   */
  publishWeaveKill (data) {
    log.info({ data: data }, 'publisher.publishWeaveKill')
    this.publishTask('weave.kill', data)
  }

  /**
   * publish weave.peer.forget job
   * @param {Object} data data to pass to job
   */
  publishWeavePeerForget (data) {
    log.info({ data: data }, 'publisher.publishWeavePeerForget')
    this.publishTask('weave.peer.forget', data)
  }

  /**
   * publish weave.peer.remove job
   * @param {Object} data data to pass to job
   */
  publishWeavePeerRemove (data) {
    log.info({ data: data }, 'publisher.publishWeavePeerRemove')
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
    log.info(data, 'publisher.publishDockLost')
    this.publishTask('dock.lost', data)
  }

}

module.exports = new Publisher()
