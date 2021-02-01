const { promisify: pify } = require(`util`)
const { archive } = require(`../../drive`)
const crypto = require(`crypto`)
const moment = require(`moment-timezone`)
const debug = require(`debug`)(`qnzl:aw-sync:add`)
const auth = require(`@qnzl/auth`)

let SEEN_BUCKETS = []

;(async () => {
  const bucketData = await archive.preadFile(`/buckets`)

  SEEN_BUCKETS = JSON.parse(bucketData)

  debug(`loaded bucket list: ${SEEN_BUCKETS}`)
})()

const groupEventsByTime = (data) => {
  return data.reduce((groups, event) => {
    const adjTimestamp = moment(event.timestamp).format(`YYYY-MM-DD`)

    if (adjTimestamp in groups) {
      groups[adjTimestamp].push(event)
    } else {
      groups[adjTimestamp] = [ event ]
    }

    return groups
  }, {})
}

const getPreexistingContents = async (file) => {
  return await archive.preadFile(file)
}

const dedupe = (events) => {
  const seenEvents = {}

  return events.filter((event) => {
    const existingEvent = seenEvents[event.id]

    if (existingEvent) {
      return false
    }

    seenEvents[event.id] = event

    return true
  })
}

const addEvents = async (ctx, next) => {
  const { id } = ctx.params
  debug(`got request for adding activity for watcher ${id}`)


  const { data } = ctx.request.body

  const groupedEvents = groupEventsByTime(data)

  debug(`adding activity for watcher ${id}`)

  if (!SEEN_BUCKETS.includes(id)) {
    debug(`have never seen ${id} before, adding to bucket list`)

    SEEN_BUCKETS.push(id)

    await archive.pwriteFile(`/buckets`, Buffer.from(JSON.stringify(SEEN_BUCKETS)))
  }

  try {
    Object.keys(groupedEvents).forEach(async (timestamp) => {
      let events = groupedEvents[timestamp]
      const file = `${id}/${timestamp}`

      debug(`${events.length} events have been sent in`)

      try {
        const preexistingEvents = JSON.parse(await getPreexistingContents(file))

        debug(`found ${preexistingEvents.length} events that already existed in ${file}`)

        events = dedupe(preexistingEvents.concat(events))
      } catch (e) {
        console.error(e)
      }

      debug(`has ${events.length} after deduping`)

      const stringifiedData = JSON.stringify(events)
      const bufferedData = Buffer.from(stringifiedData)

      debug(`writing file ${id} for timestamp ${timestamp}`)

      await archive.pwriteFile(file, bufferedData)

      debug(`wrote file ${id} for timestamp ${timestamp}`)
    })

    ctx.response.status = 200

    return next()
  } catch (e) {
    ctx.response.status = 500

    debug(`failed to write file`, e)
    return next(e)
  }
}

module.exports = addEvents

