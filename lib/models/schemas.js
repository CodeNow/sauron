'use strict'

const joi = require('joi')

exports.weaveKill = joi.object({
  containerId: joi.string().required()
}).unknown().required()

exports.weaveStart = joi.object({
  dockerUri: joi.string().required(),
  orgId: joi.string().required()
}).unknown().required()

exports.weavePeerForget =
exports.weavePeerRemove = joi.object({
  dockerHost: joi.string().required(),
  hostname: joi.string().required(),
  orgId: joi.string().required()
}).unknown().required()

exports.weavePeerRemove = joi.object({
  dockerHost: joi.string().required(),
  hostname: joi.string().required(),
  orgId: joi.string().required(),
  tid: joi.string()
}).unknown().required()

exports.eventsStreamConnected =
exports.eventsStreamDisconnected = joi.object({
  host: joi.string().required(),
  org: joi.string().required()
}).unknown().required()

exports.containerLifeCycleStarted =
exports.containerLifeCycleDied = joi.object({
  id: joi.string().required(),
  host: joi.string().required(),
  from: joi.string().required(),
  org: joi.string().required()
}).unknown().required()
