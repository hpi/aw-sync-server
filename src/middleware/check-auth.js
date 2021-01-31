const debug = require(`debug`)(`qnzl:aw-sync:check-auth`)
const Auth = require(`@qnzl/auth`)

const {
  ISSUER,
  JWT_PUBLIC_KEY,
} = process.env

module.exports = (desiredClaim) => (ctx, next) => {
  const { authorization } = ctx.req.headers

  const auth = new Auth(JWT_PUBLIC_KEY)

  const isValidToken = auth.checkJWT(authorization, {
    desiredClaim,
    subject: `watchers`,
    issuer: ISSUER,
  }`aw:update`, `watchers`, ISSUER)

  if (!isValidToken) {
    debug(`failed to authenticate`)

    ctx.response.statusCode = 401

    return next(`could not authenticate request`)
  }

  debug(`successfully authenticated`)

  return next()
}
