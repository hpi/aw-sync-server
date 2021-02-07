const hyperdrive = require(`hyperdrive`)
const hyperswarm = require(`hyperswarm`)

const swarm = hyperswarm()
const archive = hyperdrive(`./aw`)

archive.on(`ready`, () => {
  console.log(`Drive is ready, public key is: ${archive.key.toString(`hex`)}`)

  swarm.join(archive.discoveryKey, {
    lookup: true,
    announce: true
  })

  swarm.on(`connection`, (socket, info) => {
    const replicateStream = archive.replicate({
      live: true,
      upload: true,
      download: true
    })

    replicateStream.pipe(socket).pipe(replicateStream)
  })
})

hyperdrive.prototype.pmkdir = (path) => {
  return new Promise((resolve, reject) => {
    archive.mkdir(path, { recursive: true }, (err, data) => {
      if (err) return reject(err)

      return resolve(data)
    })
  })
}

hyperdrive.prototype.pwriteFile = (path, data) => {
  return new Promise((resolve, reject) => {
    archive.writeFile(path, data, async (err, data) => {
      if (err) return reject(data)

      return resolve(data)
    })
  })
}

hyperdrive.prototype.preaddir = (path) => {
  return new Promise((resolve, reject) => {
    archive.readdir(path, (err, files) => {
      if (err) return reject(err)

      return resolve(files)
    })
  })
}

hyperdrive.prototype.preadFile = (file) => {
  return new Promise((resolve, reject) => {
    archive.readFile(file, { encoding: `utf8` }, (err, data) => {
      if (err) return reject(err)

      return resolve(data)
    })
  })
}
module.exports = { archive }

