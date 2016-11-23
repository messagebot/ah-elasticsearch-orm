var should = require('should')
var path = require('path')
var specHelper = require(path.join(__dirname, '/specHelper.js')).specHelper
var api

describe('ah-elasticsearch-orm', function () {
  describe('framework', function () {
    before(function () { api = specHelper.api })

    it('server booted and normal actions work', function (done) {
      api.specHelper.runAction('status', function (response) {
        response.serverInformation.serverName.should.equal('my_actionhero_project')
        done()
      })
    })

    it('has loaded cluster info', function (done) {
      should.exist(api.elasticsearch.info.name)
      var semverParts = api.elasticsearch.info.version.number.split('.')
      semverParts[0].should.be.aboveOrEqual(2)
      done()
    })
  })
})
