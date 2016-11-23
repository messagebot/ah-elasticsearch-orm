var path = require('path')

module.exports = function (api) {
  var utils = require(path.join(__dirname, '/utils.js'))(api)
  var prepareData = require(path.join(__dirname, '/instance/prepareData.js'))(api)
  var ensureGuid = require(path.join(__dirname, '/instance/ensureGuid.js'))(api)
  var create = require(path.join(__dirname, '/instance/create.js'))(api)
  var edit = require(path.join(__dirname, '/instance/edit.js'))(api)
  var hydrate = require(path.join(__dirname, '/instance/hydrate.js'))(api)
  var del = require(path.join(__dirname, '/instance/del.js'))(api)

  var elasticsearchModel = function (type, guid, index, alias) {
    this.type = type
    this.index = index
    this.alias = alias
    this.data = {
      guid: utils.cleanGuid(guid) || null
    }
    this.requiredFields = []
    this.topLevelFields = []
  }

  elasticsearchModel.prototype.prepareData = prepareData
  elasticsearchModel.prototype.ensureGuid = ensureGuid
  elasticsearchModel.prototype.create = create
  elasticsearchModel.prototype.edit = edit
  elasticsearchModel.prototype.hydrate = hydrate
  elasticsearchModel.prototype.del = del

  return elasticsearchModel
}
