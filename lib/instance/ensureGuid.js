var uuid = require('node-uuid')
var path = require('path')

module.exports = function (api) {
  var utils = require(path.join(__dirname, '/../utils.js'))(api)

  var ensureGuid = function () {
    var self = this
    if (!self.data.guid) {
      self.data.guid = utils.cleanGuid(uuid.v4())
    }
    return self.data.guid
  }

  return ensureGuid
}
