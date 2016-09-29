'use strict'

const joi = require('joi')

module.exports.weaveKill = joi.object({
  containerId: joi.string().required(),
  tid: joi.string()
}).unknown().required()

module.exports.weaveStart = joi.object({
  dockerUri: joi.string().required(),
  orgId: joi.string().required(),
  tid: joi.string()
}).unknown().required()

module.exports.weavePeerForget = joi.object({
  dockerHost: joi.string().required(),
  hostname: joi.string().required(),
  orgId: joi.string().required(),
  tid: joi.string()
}).unknown().required()

module.exports.weavePeerRemove = joi.object({
  dockerHost: joi.string().required(),
  hostname: joi.string().required(),
  orgId: joi.string().required(),
  tid: joi.string()
}).unknown().required()
