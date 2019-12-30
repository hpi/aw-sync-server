const koaRouter = require(`koa-router`)

const router = new koaRouter()

const buckets = require(`./buckets`)
const add = require(`./add`)
const get = require(`./get`)

router.use(`/buckets`, buckets.routes(), buckets.allowedMethods())
router.use(`/get`, get.routes(), get.allowedMethods())
router.use(`/add`, add.routes(), add.allowedMethods())

module.exports = router

