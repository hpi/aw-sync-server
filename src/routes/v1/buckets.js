const { promisify: pify } = require(`util`)
const { archive } = require(`../../drive`)
const moment = require(`moment`)
const debug = require(`debug`)(`qnzl:aw-sync:add`)
const auth = require(`@qnzl/auth`)

const {
  ISSUER,
} = process.env

const getBuckets = async (ctx, next) => {
  debug(`got request for getting buckets`)

  const { data, timestamp } = ctx.request.body
  const { id } = ctx.params

  try {
    const data = await archive.preadFile(`/buckets`)

    const buckets = JSON.parse(data)

    debug(`got bucket data`, buckets)

    ctx.response.body = { buckets }
    return next()
  } catch (e) {
    debug(`failed to write file`, e)
    return next(e)
  }
}

module.exports = getBuckets


