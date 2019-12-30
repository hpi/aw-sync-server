const { promisify: pify } = require(`util`)
const { archive } = require(`../../drive`)
const moment = require(`moment`)
const debug = require(`debug`)(`qnzl:aw-sync:add`)
const auth = require(`@qnzl/auth`)

const getBuckets = async (ctx, next) => {
  debug(`got request for getting buckets`)

  const { authorization } = ctx.headers

  if (!authorization) {
    return res.sendStatus(401)
  }

  const isValidToken = auth.checkJWT(authorization, `aw:get`, `watchers`, `https://qnzl.co`)

  if (!isValidToken) {
    debug(`failed to authenticate`)
    return res.sendStatus(401)
  }

  debug(`successfully authenticated`)

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


