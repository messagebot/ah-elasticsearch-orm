var async      = require('async');
var should     = require('should');
var dateformat = require('dateformat');
var specHelper = require(__dirname + '/specHelper.js').specHelper;
var now = new Date();
var thisMonth = dateformat(now, 'yyyy-mm');
var nextMonth = dateformat(new Date( now.getTime() + (1000 * 60 * 60 * 24 * 31) ), 'yyyy-mm');
var api;

describe('ah-elasticsearch-orm', function(){
  describe('migrations', function(){
    before(function(){ api = specHelper.api; });

    before(function(done){
      specHelper.doBash('curl -X DELETE http://localhost:9200/test-people-' + thisMonth + ' && curl -X DELETE http://localhost:9200/test-people-' + nextMonth + ' && sleep 5', done, true);
    })

    it('can migrate once', function(done){
      specHelper.doBash('NODE_ENV=test cd ' + specHelper.testDir + '  && ./node_modules/ah-elasticsearch-orm/bin/ah-elasticsearch-orm migrate', function(error, results){
        should.not.exist(error);
        results.should.containEql('ah-elasticsearch-orm')
        results.should.containEql('creating index: test-people-' + thisMonth);
        results.should.containEql('creating index: test-people-' + nextMonth);
        done();
      }, true);
    });

    it('will skip existing indexes when migrating again', function(done){
      specHelper.doBash('NODE_ENV=test cd ' + specHelper.testDir + '  && ./node_modules/ah-elasticsearch-orm/bin/ah-elasticsearch-orm migrate', function(error, results){
        should.not.exist(error);
        results.should.containEql('ah-elasticsearch-orm');
        results.should.not.containEql('creating index: test-people-' + thisMonth);
        results.should.not.containEql('creating index: test-people-' + nextMonth);
        results.should.containEql('skipping index: test-people-' + thisMonth);
        results.should.containEql('skipping index: test-people-' + nextMonth);
        done();
      }, true);
    });

    it('should have correct aliases', function(done){
      api.elasticsearch.client.cat.aliases({ name: 'test-people' }, function(error, aliases){
        should.not.exist(error);
        aliases = aliases.split('\n');
        var cleaned = [];
        aliases.forEach(function(a){
          if(a.length > 1){ cleaned.push(a); }
        });
        cleaned.sort();

        cleaned[0].should.containEql('test-people test-people-' + thisMonth);
        cleaned[1].should.containEql('test-people test-people-' + nextMonth);
        done();
      });
    });
  });

});
