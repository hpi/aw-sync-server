const bodyParser = require(`body-parser`)
const hyperdrive = require(`hyperdrive`)
const hyperswarm = require(`hyperswarm`)
const koaRouter = require(`koa-router`)
const koaBody = require(`koa-body`)
const https = require(`https`)
const http = require(`http`)
const koa = require(`koa`)
const fs = require(`fs`)

const app = new koa()
const router = new koaRouter()

const addEvents = require(`./routes/v1/add`)
const getEvents = require(`./routes/v1/get`)
const getBuckets = require(`./routes/v1/buckets`)

router.post(`/api/v1/add/:id`, addEvents)
router.get(`/api/v1/get/:id`, getEvents)
router.get(`/api/v1/buckets`, getBuckets)
router.get(`/ping`, (ctx, next) => {
  ctx.response.status = 200

  return next()
})

app.use(koaBody())
app.use(router.routes())
app.use(router.allowedMethods())

const port = process.env.PORT || 3080

if ('production' === process.env.ENV) {
  https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/activitywatch.maddie.today/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/activitywatch.maddie.today/cert.pem')
  }, app.callback()).listen(port, () => {
    console.log(`Express server listening on port ${port}, ENV=production`)
  })
} else {
  http.createServer(app.callback()).listen(port, () => {
    console.log(`Express server listening on port ${port}, ENV=staging`)
  })
}


