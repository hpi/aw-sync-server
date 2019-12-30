const { archive } = require(`../../drive`)
const koaRouter = require(`koa-router`)
const { URL } = require(`url`)
const moment = require(`moment-timezone`)
const debug = require(`debug`)(`qnzl:aw-sync:get`)
const auth = require(`@qnzl/auth`)

const router = new koaRouter()

const mergeEvents = (id, events) => {
  let mergedEvents = {}

  if (id.indexOf(`-window`) > -1) {
    const removedFirefox = events.filter(({ data: { app } }) => {
      return app !== `Firefox`
    })

    removedFirefox.forEach((event) => {
      const { data: { app } } = event

      if (app in mergedEvents) {
        mergedEvents[app].duration += event.duration
      } else {
        mergedEvents[app] = event
      }
    })

  } else if (id.indexOf(`-web-firefox`) > -1) {

    events.forEach((event) => {
    const { data: { url } } = event
      const wrappedUrl = new URL(url)
      const { hostname } = wrappedUrl

      console.log("EVENT:", event, hostname)
      if (hostname in mergedEvents) {
        mergedEvents[hostname].duration += event.duration
      } else {
        mergedEvents[hostname] = event
      }
    })
  }

  return Object.values(mergedEvents)
}

const getEvents = async (ctx, next) => {
  let { authorization } = ctx.request.headers
  let { id } = ctx.params
  let { date } = ctx.query

  debug(`got request for getting events`)

  if (!authorization) {
    ctx.response.status = 401

    return next()
  }

  if (!id || !date) {
    ctx.response.status = 400

    return next()
  }

  // TODO Use @qnzl/auth instead of magic strings
  const isValidToken = auth.checkJWT(authorization, `aw:get`, `watchers`, `https://qnzl.co`)

  if (!isValidToken) {
    debug(`failed to authenticate`)
    ctx.response.status = 401

    return next()
  }

  debug(`successfully authenticated`)

  try {
    let data

    const files = await archive.preaddir(`/${id}`)

    date = date.split(` `)[0]
    const dateTimestamp = moment(date).format(`YYYY-MM-DD`)
    const dayBeforeTimestamp = moment(dateTimestamp).subtract(1, `day`).format(`YYYY-MM-DD`)
    const dayAfterTimestamp = moment(dateTimestamp).add(1, `day`).format(`YYYY-MM-DD`)

    const mustMatchDates = [ dayBeforeTimestamp, dateTimestamp, dayAfterTimestamp ]

    debug(`have ${files.length} files for id ${id}`)
    data = files.map((file) => {

      if (!mustMatchDates.includes(file)) return Promise.resolve(null)

      debug(`read /${id}/${file}`)
      return archive.preadFile(`/${id}/${file}`)
    })

    debug(`got ${data.length} files of data`)
    // Extract and parse file contents into one big array
    let resolvedData = await Promise.all(data)
    resolvedData = resolvedData.filter(Boolean).map(JSON.parse)
    resolvedData = [].concat(...resolvedData)

    // Basic filter so response only includes requested events
    const adjustedAfterDate = moment(date || `2000-01-01`).tz(`America/New_York`).startOf(`day`)
    const adjustedBeforeDate = moment(date || `2099-01-01`).tz(`America/New_York`).endOf(`day`)

    const filteredData = resolvedData.filter((event) => {
      event.timestamp = event.timestamp.replace(`+00:00`, `Z`)
      const eventTimestamp = moment(event.timestamp).tz(`America/New_York`)

      return eventTimestamp.isAfter(adjustedAfterDate) && eventTimestamp.isBefore(adjustedBeforeDate)
    })

    const mergedEvents = mergeEvents(id, filteredData)

    debug(`returning ${mergedEvents.length} events`)

    ctx.response.status = 200
    ctx.response.body = mergedEvents

    return next()
  } catch (e) {
    console.log("EE:", e)
    ctx.response.status = 500
    return next(e)
  }
}

module.exports = getEvents

