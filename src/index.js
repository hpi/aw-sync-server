const bodyParser = require(`body-parser`)
const hyperdrive = require(`hyperdrive`)
const hyperswarm = require(`hyperswarm`)
const koaRouter = require(`koa-router`)
const koaBody = require(`koa-body`)
const https = require(`https`)
const http = require(`http`)
const koa = require(`koa`)
const fs = require(`fs`)

const {
  PORT,
  ENV,
  SSL_KEY,
  SSL_CERT,
} = process.env

const app = new koa()
const router = new koaRouter()

const addEvents = require(`./routes/v1/add`)
const getEvents = require(`./routes/v1/get`)
const getBuckets = require(`./routes/v1/buckets`)
const auditEvents = require(`./routes/v1/audit`)

const checkAuth = require(`./middleware/check-auth`)

router.post(`/api/v1/add/:id`, checkAuth(`aw:update`), addEvents)
router.get(`/api/v1/audit/:id`, checkAuth(`aw:audit`), auditEvents)
router.get(`/api/v1/get/:id`, checkAuth(`aw:get`), getEvents)
router.get(`/api/v1/buckets`, checkAuth(`aw:get`), getBuckets)
router.get(`/ping`, (ctx, next) => {
  ctx.response.status = 200

  return next()
})

app.use(koaBody())
app.use(router.routes())
app.use(router.allowedMethods())

const port = PORT || 3080

if (ENV === `production`) {
  https.createServer({
    key: fs.readFileSync(SSL_KEY),
    cert: fs.readFileSync(SSL_CERT)
  }, app.callback()).listen(port, () => {
    console.log(`Express server listening on port ${port}, ENV=production`)
  })
} else {
  http.createServer(app.callback()).listen(port, () => {
    console.log(`Express server listening on port ${port}, ENV=staging`)
  })
}


