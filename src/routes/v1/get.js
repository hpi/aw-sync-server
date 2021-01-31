const { archive } = require(`../../drive`)
const koaRouter = require(`koa-router`)
const { URL } = require(`url`)
const moment = require(`moment-timezone`)
const debug = require(`debug`)(`qnzl:aw-sync:get`)
const auth = require(`@qnzl/auth`)

const router = new koaRouter()

const mergeEvents = (id, events) => {
  let mergedEvents = {}

  if (id.indexOf(`window`) > -1) {
    const noBrowserEvents = events.filter(({ data: { app } }) => {
      return app !== `Firefox` && app !== `Google-chrome` && app !== `Safari`
    })

    noBrowserEvents.forEach((event) => {
      const { data: { app } } = event

      if (app in mergedEvents) {
        mergedEvents[app].duration += event.duration
      } else {
        mergedEvents[app] = { ...event }
      }
    })

  } else if (id.includes(`firefox`) || id.includes(`safari`) || id.includes(`chrome`)) {
    events.forEach((event) => {
      const { data: { url } } = event

      try {
        let hostname = 'New tab'

        if (Boolean(url)) {
          const wrappedUrl = new URL(url)

          hostname = wrappedUrl.hostname
        }

        if (hostname in mergedEvents) {
          mergedEvents[hostname].duration += event.duration
        } else {
          mergedEvents[hostname] = { ...event }
        }
      } catch (e) {
        console.log("Error parsing: ", e, url, event)
      }
    })
  }

  return Object.values(mergedEvents)
}

const getEvents = async (ctx, next) => {
  let { id } = ctx.params
  let { date } = ctx.query

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

        if (!mustMatchDates.includes(file)) return Promise.resolve(null)

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

      toMergeData = resolvedData.filter((event) => {
        event.timestamp = event.timestamp.replace(`+00:00`, `Z`)
        const eventTimestamp = moment(event.timestamp).tz(`America/New_York`)

        return eventTimestamp.isBetween(startOfDay, endOfDay)
      })
    }

    const mergedEvents = mergeEvents(id, toMergeData)

    debug(`returning ${mergedEvents.length} events`)

    ctx.response.status = 200
    ctx.response.body = mergedEvents

    return next()
  } catch (e) {
    console.log(`Got error: `, e)
    ctx.response.status = 500

    return next(e)
  }
}

module.exports = getEvents

