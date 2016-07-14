var async      = require('async');
var should     = require('should');
var dateformat = require('dateformat');
var specHelper = require(__dirname + '/specHelper.js').specHelper;
var index = 'test-people-' + dateformat(new Date(), 'yyyy-mm');
var api;

describe('ah-elasticsearch-orm', function(){

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
    specHelper.doBash('NODE_ENV=test cd ' + specHelper.testDir + '  && ./node_modules/ah-elasticsearch-orm/bin/ah-elasticsearch-orm migrate', done, true);
  });

  after(function(done){
    specHelper.stop(done);
  });

  describe('instances', function(){
    it('can create an instnace (simple)', function(done){
      var jobs = [];
      var person;

      jobs.push(function(next){
        person = new api.models.person();
        person.data.source = 'web';
        person.create(function(error){
          should.not.exist(error);
          person.data.guid.should.exist;
          next();
        });
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        var p2 = new api.models.person(person.data.guid);
        p2.hydrate(function(error){
          should.not.exist(error);
          p2.type.should.equal('person');
          p2.index.should.equal(index);
          p2.alias.should.equal('test-people');
          dateformat(p2.data.createdAt, 'yyyy-mm-dd').should.equal( dateformat(new Date(), 'yyyy-mm-dd') );
          dateformat(p2.data.updatedAt, 'yyyy-mm-dd').should.equal( dateformat(new Date(), 'yyyy-mm-dd') );
          next();
        });
      });

      async.series(jobs, done);
    });

    it('will not create an instance with missing required params', function(done){
      var person = new api.models.person();
      person.create(function(error){
        error.message.should.equal('source is a required field');
        done();
      });
    });

    it('can create an instnace (complex data)', function(done){
      var jobs = [];
      var person;

      jobs.push(function(next){
        person = new api.models.person();
        person.data.source = 'web';
        person.data.createdAt = new Date(100);
        person.data.data = {
          thing: 'stuff',
          nested: {deep: true},
          timestamp: new Date(100),
        }
        person.create(function(error){
          should.not.exist(error);
          person.data.guid.should.exist;
          next();
        });
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        var p2 = new api.models.person(person.data.guid);
        p2.hydrate(function(error){
          should.not.exist(error);
          p2.type.should.equal('person');
          p2.index.should.equal(index);
          p2.alias.should.equal('test-people');
          (p2.data.createdAt.getTime()).should.equal( (new Date(100)).getTime() ); // custom createdAt
          dateformat(p2.data.updatedAt, 'yyyy-mm-dd').should.equal( dateformat(new Date(), 'yyyy-mm-dd') );

          // custom data properties
          p2.data.data.thing.should.equal('stuff');
          p2.data.data.nested.deep.should.equal(true);
          // hydrated timetamps properly
          (p2.data.data.timestamp.getTime()).should.equal( (new Date(100)).getTime() );

          next();
        });
      });

      async.series(jobs, done);
    });

    it('can create an with a provided guid', function(done){
      var jobs = [];
      var person;
      var guid = 'abc123';

      jobs.push(function(next){
        person = new api.models.person();
        person.data.guid = guid;
        person.data.source = 'web';
        person.create(function(error){
          should.not.exist(error);
          person.data.guid.should.equal(guid);
          next();
        });
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        var p2 = new api.models.person(guid);
        p2.hydrate(function(error){
          should.not.exist(error);
          p2.data.guid.should.equal(guid);
          next();
        });
      });

      async.series(jobs, done);
    });

    it('will fail when creating a duplicte object by guid', function(done){
      var jobs = [];
      var person, person2;

      jobs.push(function(next){
        person = new api.models.person();
        person.data.source = 'web';
        person.create(function(error){
          should.not.exist(error);
          next();
        });
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        person2 = new api.models.person();
        person2.data.guid = person.data.guid;
        person2.data.source = 'web';
        person2.create(function(error){
          error.message.should.containEql('[document_already_exists_exception] [person]');
          done();
        });
      });

      async.series(jobs, done);
    });

    it('can detect if an instance exists via uniqueFields when creating and update it instead', function(done){
      var jobs = [];
      var person, person2;

      jobs.push(function(next){
        person = new api.models.person();
        person.data.email = 'a@fake.com';
        person.data.a = 1;
        person.data.source = 'web';
        person.create(function(error){
          should.not.exist(error);
          next();
        });
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        person2 = new api.models.person();
        person2.data.email = 'a@fake.com';
        person2.data.source = 'web';
        person2.data.b = 2;
        person2.create(function(error){
          should.not.exist(error);
          next();
        });
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        person.hydrate(function(error){
          should.not.exist(error);
          person.data.data.a.should.equal(1);
          person.data.data.b.should.equal(2);
          next();
        });
      });

      jobs.push(function(next){
        api.elasticsearch.distinct(api, 'test-people', ['guid'], [person.data.guid], new Date(0), new Date(), 'createdAt', 'guid', 0, function(error, data){
          should.not.exist(error);
          data.buckets.length.should.equal(1);
          done();
        });
      });

      async.series(jobs, done);
    });

    it('can delete an instnace')
    it('can edit an instnace')
    it('can hydrate an instnace (simple)')
    it('can hydrate an instnace (complex data)')
  });

});
