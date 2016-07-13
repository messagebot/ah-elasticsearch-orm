var should     = require('should');
var dateformat = require('dateformat');
var specHelper = require(__dirname + '/specHelper.js').specHelper;
var index = 'test-people-' + dateformat(new Date(), 'yyyy-mm');
var api;

describe('ah-elasticsearch-orm', function(){

  before(function(done){
    this.timeout(1000 * 60);
    specHelper.build(done);
  });

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

  it('server booted and normal actions work', function(done){
    api.specHelper.runAction('status', function(response){
      response.serverInformation.serverName.should.equal('my_actionhero_project');
      done();
    });
  });

  describe('migrations', function(){
    before(function(done){
      var now = new Date();
      var thisMonth = dateformat(now, 'yyyy-mm');
      var nextMonth = dateformat(new Date( now.getTime() + (1000 * 60 * 60 * 24 * 30) ), 'yyyy-mm');

      specHelper.doBash('curl -X DELETE http://localhost:9200/test-people-' + thisMonth + ' && curl -X DELETE http://localhost:9200/test-people-' + nextMonth + ' && sleep 5', done);
    })

    it('can migrate once', function(done){
      specHelper.doBash('NODE_ENV=test cd ' + specHelper.testDir + '  && ./node_modules/ah-elasticsearch-orm/bin/ah-elasticsearch-orm migrate', function(error, results){
        should.not.exist(error);

        var now = new Date();
        var thisMonth = dateformat(now, 'yyyy-mm');
        var nextMonth = dateformat(new Date( now.getTime() + (1000 * 60 * 60 * 24 * 30) ), 'yyyy-mm');

        results.should.containEql('ah-elasticsearch-orm')
        results.should.containEql('creating index: test-people-' + thisMonth);
        results.should.containEql('creating index: test-people-' + nextMonth);
        done();
      });
    });

    it('will skip existing indexes when migrating again', function(done){
      specHelper.doBash('NODE_ENV=test cd ' + specHelper.testDir + '  && ./node_modules/ah-elasticsearch-orm/bin/ah-elasticsearch-orm migrate', function(error, results){
        should.not.exist(error);

        var now = new Date();
        var thisMonth = dateformat(now, 'yyyy-mm');
        var nextMonth = dateformat(new Date( now.getTime() + (1000 * 60 * 60 * 24 * 30) ), 'yyyy-mm');

        results.should.containEql('ah-elasticsearch-orm');
        results.should.not.containEql('creating index: test-people-' + thisMonth);
        results.should.not.containEql('creating index: test-people-' + nextMonth);
        results.should.containEql('skipping index: test-people-' + thisMonth);
        results.should.containEql('skipping index: test-people-' + nextMonth);
        done();
      });
    });

    it('should have correct aliases', function(){
      api.elasticsearch.client.cat.aliases({ name: 'test-people' }, function(error, aliases){
        should.not.exist(error);
        aliases = aliases.split('\n');
        aliases.length.should.equal(2);
        aliases[0].should.containEql('test-people test-people-2016-08');
        aliases[1].should.containEql('test-people test-people-2016-07');
        done();
      });
    });
  });

  describe('instances', function(){
    it('can create an instnace (simple)')
    it('can create an instnace (complex data)')
    it('can create an with a generated guid')
    it('can create an with a provided guid')
    it('can detect if an instnace exists when creating and update it instead')
    it('can delete an instnace')
    it('can edit an instnace')
    it('can hydrate an instnace (simple)')
    it('can hydrate an instnace (complex data)')
  });

  describe('agggregations', function(){
    it('aggregation (full)');
    it('aggregation (empty)');
    it('mget (full)');
    it('mget (empty)');
    it('scroll (full)');
    it('scroll (empty)');
    it('search (full)');
    it('search (empty)');
  });

  describe('cache', function(){
    it('can get new data');
    it('can load cached data');
    it('cached data will expire');
    it('will use default cache configuration when none is provided');
  });

});
