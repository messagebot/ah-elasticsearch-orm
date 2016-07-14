var async      = require('async');
var should     = require('should');
var crypto     = require('crypto');
var dateformat = require('dateformat');
var specHelper = require(__dirname + '/specHelper.js').specHelper;
var now = new Date();
var thisMonth = dateformat(now, 'yyyy-mm');
var nextMonth = dateformat(new Date( now.getTime() + (1000 * 60 * 60 * 24 * 30) ), 'yyyy-mm');
var api;

describe('ah-elasticsearch-orm', function(){
  describe('cache', function(){

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

    it('can get new data', function(done){
      api.elasticsearch.search(api, 'test-people', ['email'], ['_exists'], 0, 10, null, 1, function(error, data, totalHits, fromCache){
        should.not.exist(error);
        data.length.should.equal(10);
        totalHits.should.equal(10);
        fromCache.should.equal(false);
        done();
      });
    });

    it('can load cached data', function(done){
      var jobs = [];

      jobs.push(function(next){
        api.elasticsearch.search(api, 'test-people', ['email'], ['_exists'], 1, 10, null, 5000, function(error, data, totalHits, fromCache){
          should.not.exist(error);
          fromCache.should.equal(false);
          next();
        });
      });

      jobs.push(function(next){
        api.elasticsearch.search(api, 'test-people', ['email'], ['_exists'], 1, 10, null, 5000, function(error, data, totalHits, fromCache){
          should.not.exist(error);
          fromCache.should.equal(true);
          next();
        });
      });

      async.series(jobs, done);
    });

    it('cached data will expire', function(done){
      var jobs = [];

      jobs.push(function(next){
        api.elasticsearch.search(api, 'test-people', ['email'], ['_exists'], 2, 10, null, 1000, function(error, data, totalHits, fromCache){
          should.not.exist(error);
          fromCache.should.equal(false);
          next();
        });
      });

      jobs.push(function(next){ setTimeout(next, 1001) });

      jobs.push(function(next){
        api.elasticsearch.search(api, 'test-people', ['email'], ['_exists'], 2, 10, null, 1000, function(error, data, totalHits, fromCache){
          should.not.exist(error);
          fromCache.should.equal(false);
          next();
        });
      });

      async.series(jobs, done);
    });

    it('will use default cache configuration when none is provided', function(done){
      var jobs = [];

      jobs.push(function(next){
        api.elasticsearch.search(api, 'test-people', ['email'], ['_exists'], 5, 10, null, null, function(error, data, totalHits, fromCache){
          should.not.exist(error);
          fromCache.should.equal(false);
          next();
        });
      });

      jobs.push(function(next){
        api.elasticsearch.search(api, 'test-people', ['email'], ['_exists'], 5, 10, null, null, function(error, data, totalHits, fromCache){
          should.not.exist(error);
          fromCache.should.equal(true);
          next();
        });
      });

      async.series(jobs, done);
    });
  });
});
