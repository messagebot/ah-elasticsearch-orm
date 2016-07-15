var async      = require('async');
var should     = require('should');
var dateformat = require('dateformat');
var specHelper = require(__dirname + '/specHelper.js').specHelper;
var index = 'test-people-' + dateformat(new Date(), 'yyyy-mm');
var api;

describe('ah-elasticsearch-orm', function(){

  before(function(done){
    this.timeout(1000 * 30);
    specHelper.start(function(){
      api = specHelper.api;
      done();
    });
  });

  after(function(done){
    specHelper.stop(done);
  });

  describe('framework', function(){

    it('server booted and normal actions work', function(done){
      api.specHelper.runAction('status', function(response){
        response.serverInformation.serverName.should.equal('my_actionhero_project');
        done();
      });
    });

    it('has loaded cluster info', function(done){
      should.exist(api.elasticsearch.info.name);
      var semverParts = api.elasticsearch.info.version.number.split('.');
      semverParts[0].should.be.aboveOrEqual(2);
      done();
    });

  });

});
