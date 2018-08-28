const micro = require('micro')
const handler = require('serve-handler')

module.exports = async function server({ baseDir }) {
  const server = micro(async (req, res) => {
    return handler(req, res, {
      public: baseDir
    })
  })

  await server.listen(3000)

  return server
}
