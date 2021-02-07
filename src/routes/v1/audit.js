const { archive } = require(`../../drive`)
const koaRouter = require(`koa-router`)
const { URL } = require(`url`)
const moment = require(`moment-timezone`)
const debug = require(`debug`)(`qnzl:aw-sync:audit`)
const auth = require(`@qnzl/auth`)

const router = new koaRouter()

const auditEvents = async (ctx, next) => {
  let { id } = ctx.params
  let { date, app } = ctx.query

  debug(`got request for getting events`)

  if (!id) {
    ctx.response.status = 400

    return next()
  }

  try {
    let activityData

    const files = await archive.preaddir(`/${id}`)

    if (date) {
      date = date.split(` `)[0]
      const dateTimestamp = moment(date).format(`YYYY-MM-DD`)
      const dayBeforeTimestamp = moment(date).subtract(1, `day`).format(`YYYY-MM-DD`)
      const dayAfterTimestamp = moment(date).add(1, `day`).format(`YYYY-MM-DD`)

      const mustMatchDates = [ dayBeforeTimestamp, dateTimestamp, dayAfterTimestamp ]

      debug(`have ${files.length} files for id ${id}`)
      activityData = files.map((file) => {
        if (!mustMatchDates.includes(file)) {
          return Promise.resolve(null)
        }

        debug(`read /${id}/${file}`)
        return archive.preadFile(`/${id}/${file}`)
      })
    } else {
      activityData = files.map((file) => {
        debug(`read /${id}/${file}`)
        return archive.preadFile(`/${id}/${file}`)
      })
    }

    debug(`got ${activityData.length} files of data`)

    // Extract and parse file contents into one big array
    let resolvedData = await Promise.all(activityData)
    resolvedData = resolvedData.filter(Boolean).map(JSON.parse)
    resolvedData = [].concat(...resolvedData)

    let toMergeData = resolvedData

    if (date) {
      // Basic filter so response only includes requested events
      const dateString = `${date}T12:00:00Z`

      const startOfDay = moment(dateString).tz(`America/New_York`).startOf(`day`)
      const endOfDay = moment(dateString).tz(`America/New_York`).endOf(`day`)

      debug(`before date filter: ${toMergeData.length}`)
      toMergeData = resolvedData.filter((event) => {
        const eventTimestamp = moment(event.timestamp).tz(`America/New_York`)

        debug(`w/o tz: ${event.timestamp}, w/ tz: ${eventTimestamp}`)
        debug(`is between: ${startOfDay} and ${endOfDay}`)
        return eventTimestamp.isBetween(startOfDay, endOfDay)
      })
      debug(`after date filter: ${toMergeData.length}`)
    }

    if (app) {
      toMergeData = resolvedData.filter(({ data: { app: _app } }) => {
        debug(`filter: ${app} ?== ${_app}`)
        return app === _app
      })
    }

    debug(`returning ${toMergeData.length} events`)

    ctx.status = 200
    ctx.body = toMergeData

    return next()
  } catch (e) {
    console.log(`Got error: `, e)
    ctx.status = 500

    return next(e)
  }
}

module.exports = auditEvents

