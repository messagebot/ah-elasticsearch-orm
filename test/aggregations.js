var async      = require('async');
var should     = require('should');
var dateformat = require('dateformat');
var specHelper = require(__dirname + '/specHelper.js').specHelper;
var index = 'test-people-' + dateformat(new Date(), 'yyyy-mm');
var now = new Date();
var thisMonth = dateformat(now, 'yyyy-mm');
var nextMonth = dateformat(new Date( now.getTime() + (1000 * 60 * 60 * 24 * 30) ), 'yyyy-mm');
var api;
var guids = [];

describe('ah-elasticsearch-orm', function(){
  describe('aggregations', function(){

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
            guids.push(person.data.guid);
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

    it('aggregation (full)', function(done){
      api.elasticsearch.aggregation(api, 'test-people', ['email'], ['_exists'], new Date(0), new Date(), 'createdAt', 'date_histogram', 'createdAt', 'hour', function(error, data, fromCache){
        should.not.exist(error);
        fromCache.should.equal(false);
        data.buckets.length.should.equal(1);
        data.buckets[0].doc_count.should.equal(10);
        var key = data.buckets[0].key_as_string;
        (key.split(' ')[0]).should.equal(dateformat(now, 'yyyy-mm-dd'))
        done();
      });
    });

    it('aggregation (empty)', function(done){
      api.elasticsearch.aggregation(api, 'test-people', ['email'], ['_exists'], new Date(), new Date(), 'createdAt', 'date_histogram', 'createdAt', 'hour', function(error, data, fromCache){
        should.not.exist(error);
        fromCache.should.equal(false);
        data.buckets.length.should.equal(0);
        done();
      });
    });

    it('mget (full)', function(done){
      api.elasticsearch.mget(api, 'test-people', guids, function(error, data, fromCache){
        should.not.exist(error);
        fromCache.should.equal(false);
        data.length.should.equal(10);
        [0,1,2,3,4,5,6,7,8,9].forEach(function(i){
          guids[i].should.equal(data[i].guid)
        });
        done();
      });
    });

    it('mget (empty)', function(done){
      api.elasticsearch.mget(api, 'test-people', [], function(error, data, fromCache){
        error.message.should.containEql('no documents to get');
        done();
      });
    });

    it('scroll (full)', function(done){
      var query = {
        "query": {
          "bool": {
            "must": [
              {
                "exists": {
                  "field": "email"
                }
              }
            ]
          }
        }
      };

      api.elasticsearch.scroll(api, 'test-people', query, ['guid', 'email'], function(error, data, totalHits){
        should.not.exist(error);
        totalHits.should.equal(10);
        data.length.should.equal(10);
        [0,1,2,3,4,5,6,7,8,9].forEach(function(i){
          should.exist(data[i].guid);
          should.exist(data[i].email);
          should.not.exist(data[i].source);
        });
        done();
      });
    });

    it('scroll (empty)', function(done){
      var query = {
        "query": {
          "bool": {
            "must": [
              {
                "exists": {
                  "field": "bacon"
                }
              }
            ]
          }
        }
      };

      api.elasticsearch.scroll(api, 'test-people', query, ['guid', 'email'], function(error, data, totalHits){
        should.not.exist(error);
        data.length.should.equal(0);
        totalHits.should.equal(0);
        done();
      });
    });

    it('search (full)', function(done){
      api.elasticsearch.search(api, 'test-people', ['email'], ['_exists'], 0, 10, null, function(error, data, totalHits, fromCache){
        should.not.exist(error);
        fromCache.should.equal(false);
        totalHits.should.equal(10);
        data.length.should.equal(10);
        done();
      });
    });

    it('search (empty)', function(done){
      api.elasticsearch.search(api, 'test-people', ['email'], ['not_found'], 0, 10, null, function(error, data, totalHits, fromCache){
        should.not.exist(error);
        fromCache.should.equal(false);
        totalHits.should.equal(0);
        data.length.should.equal(0);
        done();
      });
    });
  });
});
