/**
 * checks if the container that died is weave
 * if it is, create a start weave container job
 * @module lib/workers/container-life-cycle-died
 */
'use strict'
require('loadenv')()

const Promise = require('bluebird')
const joi = require('joi')
const RabbitMQ = require('../models/rabbitmq.js')

module.exports.jobSchema = joi.object({
  id: joi.string().required(),
  host: joi.string().required(),
  from: joi.string().required(),
  tags: joi.string().required(),
  tid: joi.string()
}).unknown().required().label('job')

module.exports.task = (job) => {
  return Promise.try(() => {
    if (!_isWeaveContainer(job)) { return }

    RabbitMQ.publishWeaveStart({
      dockerUri: job.host,
      orgId: job.tags.split(',')[0]
    })
  })
}

/**
 * checks to see if this container is the weave container
 * image of weave container is weaveworks/weave:1.2.0
 * @param  {Object}  data event data
 * @return {Boolean} true if this weave container
 */
const _isWeaveContainer = module.exports._isWeaveContainer = function (data) {
  const image = data.from || ''
  return !!~image.indexOf(process.env.WEAVE_IMAGE_NAME)
}
