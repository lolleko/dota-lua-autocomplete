const provider = require('./provider')

module.exports = {
  provide: function () {
    return provider
  },

  activate: function () {
    provider.activate()
  }
}
