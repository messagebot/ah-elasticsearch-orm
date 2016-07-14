var async      = require('async');
var should     = require('should');
var dateformat = require('dateformat');
var specHelper = require(__dirname + '/specHelper.js').specHelper;
var index = 'test-people-' + dateformat(new Date(), 'yyyy-mm');
var api;

var orignals = {
  maxPendingOperationsBehavior: null,
  maxPendingOperationsSleep: null,
  maxPendingOperations: null,
}

describe('ah-elasticsearch-orm', function(){
  describe('rate-limit', function(){

    before(function(done){
      this.timeout(1000 * 30);
      specHelper.start(function(){
        api = specHelper.api;
        orignals.maxPendingOperationsBehavior = api.config.elasticsearch.maxPendingOperationsBehavior;
        orignals.maxPendingOperationsSleep = api.config.elasticsearch.maxPendingOperationsSleep;
        orignals.maxPendingOperations = api.config.elasticsearch.maxPendingOperations;
        done();
      });
    });

    before(function(done){
      specHelper.doBash('NODE_ENV=test cd ' + specHelper.testDir + '  && ./node_modules/ah-elasticsearch-orm/bin/ah-elasticsearch-orm migrate', done, true);
    });

    beforeEach(function(done){ specHelper.flush(done); });

    afterEach(function(done){
      api.config.elasticsearch.maxPendingOperationsBehavior = orignals.maxPendingOperationsBehavior;
      api.config.elasticsearch.maxPendingOperationsSleep = orignals.maxPendingOperationsSleep;
      api.config.elasticsearch.maxPendingOperations = orignals.maxPendingOperations;
      done();
    });

    after(function(done){
      specHelper.stop(done);
    });

    it('allows multiple requests in', function(done){
      // 3 at once
      api.config.elasticsearch.maxPendingOperations = 4;
      var jobs = [];

      [1,2,3].forEach(function(i){
        jobs.push(function(next){
          var person = new api.models.person();
          person.data.source = 'web';
          person.data.email = specHelper.email();
          person.create(function(error){
            should.not.exist(error);
            next();
          });
        });
      });

      async.parallel(jobs, done);
    });

    it('rate limits (error)', function(done){
      api.config.elasticsearch.maxPendingOperations = 2;
      api.config.elasticsearch.maxPendingOperationsBehavior = 'fail';

      // 3 at once
      var jobs = [];
      var errors = [];

      [1,2,3].forEach(function(i){
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

      async.parallel(jobs, function(error){
        should.not.exist(error);
        errors.length.should.equal(1);
        errors[0].message.should.equal('Too many pending ElasticSearch operations');
        done();
      });
    });

    it('rate limits (retry)', function(done){
      api.config.elasticsearch.maxPendingOperations = 2;
      api.config.elasticsearch.maxPendingOperationsSleep = 5000;
      api.config.elasticsearch.maxPendingOperationsBehavior = 'retry';

      // 3 at once
      var jobs = [];
      var errors = [];
      var deltas = [];

      [1,2,3].forEach(function(i){
        jobs.push(function(next){
          var start = new Date();
          var person = new api.models.person();
          person.data.source = 'web';
          person.data.email = specHelper.email();
          person.create(function(error){
            var delta = new Date().getTime() - start.getTime();
            deltas.push(delta);
            if(error){ errors.push(error); }
            next();
          });
        });
      });

      async.parallel(jobs, function(error){
        should.not.exist(error);
        errors.length.should.equal(0);
        deltas.sort(function(a,b){ return a < b; });
        deltas.length.should.equal(3);
        // the %2 is because travis is really slow :(
        (deltas[0] - deltas[1]).should.be.greaterThan(5000/2);
        (deltas[0] - deltas[2]).should.be.greaterThan(5000/2);
        done();
      });
    });

  });
});
