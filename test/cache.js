var async      = require('async');
var should     = require('should');
var crypto     = require('crypto');
var dateformat = require('dateformat');
var specHelper = require(__dirname + '/specHelper.js').specHelper;
var now = new Date();
var thisMonth = dateformat(now, 'yyyy-mm');
var nextMonth = dateformat(new Date( now.getTime() + (1000 * 60 * 60 * 24 * 30) ), 'yyyy-mm');
var api;
var guids = [];

describe('ah-elasticsearch-orm', function(){
  describe('cache', function(){

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

    beforeEach(function(done){ api.redis.clients.client.flushdb(); done(); });

    after(function(done){
      specHelper.stop(done);
    });

    [

      { method: 'search',      args: ['test-people', ['email'], ['_exists'], 0, 10, null, 1000] },
      { method: 'mget',        args: ['test-people', guids, 1000] },
      { method: 'count',       args: ['test-people', ['email'], ['_exists'], 1000] },
      { method: 'distinct',    args: ['test-people', ['email'], ['_exists'], new Date(0), new Date(new Date().getTime() + (1000 * 60 * 5)), 'createdAt', 'guid', 1000] },
      { method: 'aggregation', args: ['test-people', ['email'], ['_exists'], new Date(0), new Date(new Date().getTime() + (1000 * 60 * 5)), 'createdAt', 'date_histogram', 'createdAt', 'hour', 1000] },

    ].forEach(function(q){

      it('#' + q.method + ': can get new data', function(done){
        var callback = function(){
          var error = arguments[0]; var data = arguments[1]; var fromCache = arguments[(arguments.length - 1)];
          should.not.exist(error);
          if(data.buckets){
            data.buckets[0].doc_count.should.be.greaterThan(0);
          }else if (typeof data === 'number'){
            data.should.equal(10);
          }else{
            data.length.should.equal(10);
          }
          fromCache.should.equal(false);
          done();
        };

        api.elasticsearch[q.method].apply(null, [api].concat(q.args).concat([callback]));
      });

      it('#' + q.method + ': can load cached data', function(done){
        var jobs = [];

        jobs.push(function(next){
          var callback = function(){
            var error = arguments[0]; var data = arguments[1]; var fromCache = arguments[(arguments.length - 1)];

            should.not.exist(error);
            fromCache.should.equal(false);
            next();
          }

          api.elasticsearch[q.method].apply(null, [api].concat(q.args).concat([callback]));
        });

        jobs.push(function(next){
          var callback = function(){
            var error = arguments[0]; var data = arguments[1]; var fromCache = arguments[(arguments.length - 1)];

            should.not.exist(error);
            fromCache.should.equal(true);
            next();
          }

          api.elasticsearch[q.method].apply(null, [api].concat(q.args).concat([callback]));
        });

        async.series(jobs, done);
      });

      it('#' + q.method + ': cached data will expire', function(done){
        var jobs = [];

        jobs.push(function(next){
          var callback = function(){
            var error = arguments[0]; var data = arguments[1]; var fromCache = arguments[(arguments.length - 1)];

            should.not.exist(error);
            fromCache.should.equal(false);
            next();
          }

          api.elasticsearch[q.method].apply(null, [api].concat(q.args).concat([callback]));
        });

        jobs.push(function(next){ setTimeout(next, 1001) });

        jobs.push(function(next){
          var callback = function(){
            var error = arguments[0]; var data = arguments[1]; var fromCache = arguments[(arguments.length - 1)];

            should.not.exist(error);
            fromCache.should.equal(false);
            next();
          }

          api.elasticsearch[q.method].apply(null, [api].concat(q.args).concat([callback]));
        });

        async.series(jobs, done);
      });

      it('#' + q.method + ': will use default cache configuration when none is provided', function(done){
        var jobs = [];

        jobs.push(function(next){
          var callback = function(){
            var error = arguments[0]; var data = arguments[1]; var fromCache = arguments[(arguments.length - 1)];

            should.not.exist(error);
            fromCache.should.equal(false);
            next();
          }

          api.elasticsearch[q.method].apply(null, [api].concat(q.args).concat([callback]));
        });

        jobs.push(function(next){
          var callback = function(){
            var error = arguments[0]; var data = arguments[1]; var fromCache = arguments[(arguments.length - 1)];

            should.not.exist(error);
            fromCache.should.equal(true);
            next();
          }

          api.elasticsearch[q.method].apply(null, [api].concat(q.args).concat([callback]));
        });

        async.series(jobs, done);
      });
    });
  });
});
