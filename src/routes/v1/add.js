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
  try {
    return archive.preadFile(file)
  } catch (error) {
    return []
  }
}

const getDupeEvents = (seenIds, newIds) => newIds.filter((id) => seenIds.includes(id))

const addEvents = async (ctx, next) => {
  const { id } = ctx.params
  debug(`adding activity for watcher ${id}`)

  const { mergedEvents, eventIds } = ctx.request.body

  const groupedEvents = groupEventsByTime(mergedEvents)

  if (!SEEN_BUCKETS.includes(id)) {
    debug(`have never seen ${id} before, adding to bucket list`)

    SEEN_BUCKETS.push(id)

    await archive.pwriteFile(`/buckets`, Buffer.from(JSON.stringify(SEEN_BUCKETS)))
  }

  try {
    let seenEventIds = JSON.parse(await getPreexistingContents(`${id}/seenEvents`))

    Object.keys(groupedEvents).forEach(async (timestamp) => {
      let events = groupedEvents[timestamp]
      const file = `${id}/${timestamp}`

      debug(`${events.length} events have been sent in`)

      try {
        const preexistingEvents = JSON.parse(await getPreexistingContents(file))

        const dupeEvents = getDupeEvents(seenEventIds, eventIds)

        if (dupeEvents.length > 0) {
          debug(`got ${dupeEvents.length} dupe events`)

          const oldestDupe = dupeEvents.sort().slice(0)

          debug(`oldest dupe event: ${oldestDupeEvent}`)

          ctx.response.status = 400
          ctx.response.body = {
            oldestDupe,
          }

          return next()
        }

        debug(`found ${preexistingEvents.length} events that already existed in ${file}`)

        events = preexistingEvents.concat(events)
        seenEventIds = seenEventIds.concat(eventIds)
      } catch (e) {
        console.error(`Error occured concating events: `, e)
      }

      debug(`has ${events.length} now`)

      const stringifiedEvents = JSON.stringify(events)
      const bufferedEvents = Buffer.from(stringifiedEvents)

      await archive.pwriteFile(file, bufferedEvents)

      debug(`wrote file ${id} for timestamp ${timestamp}`)
    })

    // Persist the seen event IDs
    const stringifiedIds = JSON.stringify(seenEventIds)
    const bufferedIds = Buffer.from(stringifiedIds)

    await archive.pwriteFile(`${id}/seenEvents`, bufferedIds)

    ctx.response.status = 200

    return next()
  } catch (e) {
    ctx.response.status = 500

    debug(`failed to write file`, e)
    return next(e)
  }
}

module.exports = addEvents

