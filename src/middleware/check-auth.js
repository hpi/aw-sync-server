const debug = require(`debug`)(`qnzl:aw-sync:check-auth`)
const Auth = require(`@qnzl/auth`)

const {
  ISSUER,
  JWT_PUBLIC_KEY,
} = process.env

module.exports = (desiredClaim) => async (ctx, next) => {
  const { authorization } = ctx.req.headers

  const auth = new Auth(JWT_PUBLIC_KEY)

  const [ _, token ] = authorization.split(` `)

  const isValidToken = auth.check(token, {
    desiredClaim,
    subject: `watchers`,
    issuer: ISSUER,
  })

  if (isValidToken) {
    debug(`successfully authenticated`)

    return next()
  }

  debug(`failed to authenticate`)

  ctx.status = 401
  ctx.body = `could not authenticate`
}
