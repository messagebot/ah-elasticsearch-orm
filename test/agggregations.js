var async      = require('async');
var should     = require('should');
var dateformat = require('dateformat');
var specHelper = require(__dirname + '/specHelper.js').specHelper;
var index = 'test-people-' + dateformat(new Date(), 'yyyy-mm');
var api;

describe('ah-elasticsearch-orm', function(){
  describe('agggregations', function(){

    before(function(done){
      this.timeout(1000 * 60);
      specHelper.buildOnce(done);
    });

    before(function(done){
      this.timeout(1000 * 30);
      specHelper.start(function(){
        api = specHelper.api;
        done();
      });
    });

    before(function(done){
      specHelper.doBash('curl -X DELETE http://localhost:9200/test-people-' + thisMonth + ' && curl -X DELETE http://localhost:9200/test-people-' + nextMonth + ' && sleep 5', done, true);
    })

    before(function(done){
      specHelper.doBash('NODE_ENV=test cd ' + specHelper.testDir + '  && ./node_modules/ah-elasticsearch-orm/bin/ah-elasticsearch-orm migrate', done, true);
    });

    before(function(done){
      var jobs = [];

      [1,2,3,4,5,6,7,8,9,10].forEach(function(i){
        jobs.push(function(next){
          var person = new api.models.person();
          person.data.source = 'web';
          person.data.email = specHelper.email();
          person.create(function(error){
            if(error){ errors.push(error); }
            next();
          });
        });
      });

      async.parallel(jobs, done);
    });

    before(function(done){ specHelper.ensureWrite(done); });

    after(function(done){
      specHelper.stop(done);
    });

    it('aggregation (full)');
    it('aggregation (empty)');
    it('mget (full)');
    it('mget (empty)');
    it('scroll (full)');
    it('scroll (empty)');
    it('search (full)');
    it('search (empty)');
  });
});
