var async      = require('async');
var should     = require('should');
var dateformat = require('dateformat');
var specHelper = require(__dirname + '/specHelper.js').specHelper;
var index = 'test-people-' + dateformat(new Date(), 'yyyy-mm');
var api;

function email(){
  var email = '';
  var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
  for( var i=0; i < 10; i++ ){
    email += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return email + '@fake.com';
};

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

  beforeEach(function(done){ specHelper.ensureWrite(done); });

  after(function(done){
    specHelper.stop(done);
  });

  describe('instances', function(){
    it('can create and hydrate an instnace (simple)', function(done){
      var jobs = [];
      var person;

      jobs.push(function(next){
        person = new api.models.person();
        person.data.source = 'web';
        person.data.email = email();
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

    it('can create and hydrate an instnace (complex data)', function(done){
      var jobs = [];
      var person;

      jobs.push(function(next){
        person = new api.models.person();
        person.data.source = 'web';
        person.data.email = email();
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
      var guid = 'abc123' + new Date().getTime();

      jobs.push(function(next){
        person = new api.models.person();
        person.data.guid = guid;
        person.data.source = 'web';
        person.data.email = email();
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
        person.data.email = email();
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
        person2.data.email = 'a@fake.com';
        person2.create(function(error){
          if(process.env.ES_VERSION === '1.7.4'){
            error.message.should.containEql('DocumentAlreadyExistsException');
          }else{
            error.message.should.containEql('[document_already_exists_exception] [person]');
          }
          next();
        });
      });

      async.series(jobs, done);
    });

    it('#create will fail is uniqueFields is violated', function(done){
      var jobs = [];
      var person, person2;
      var e = email();

      jobs.push(function(next){
        person = new api.models.person();
        person.data.email = e;
        person.data.source = 'web';
        person.create(function(error){
          should.not.exist(error);
          next();
        });
      });

      jobs.push(function(next){ specHelper.ensureWrite(next); });

      jobs.push(function(next){
        person2 = new api.models.person();
        person2.data.email = e;
        person2.data.source = 'web';
        person2.create(function(error){
          error.message.should.containEql('uniqueFields:email uniqueness violated via');
          next();
        });
      });

      async.series(jobs, done);
    });

    it('can delete an instnace', function(done){
      var jobs = [];
      var person;

      jobs.push(function(next){
        person = new api.models.person();
        person.data.source = 'web';
        person.data.email = 'a@fake.com';
        person.create(next);
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        person.del(function(error){
          should.not.exist(error);
          next();
        });
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        person.hydrate(function(error){
          error.message.should.equal('person (' + person.data.guid + ') not found')
          next();
        });
      });

      async.series(jobs, done);
    });

    it('can edit an instnace (simple)', function(done){
      var jobs = [];
      var person;

      jobs.push(function(next){
        person = new api.models.person();
        person.data.source = 'web';
        person.data.email = email();
        person.create(next);
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        person.data.source = 'iphone';
        person.edit(function(error){
          should.not.exist(error);
          next();
        });
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        var p2 = new api.models.person(person.data.guid);
        p2.hydrate(function(error){
          should.not.exist(error);
          p2.data.source.should.equal('iphone');
          next();
        });
      });

      async.series(jobs, done);
    });

    it('can edit an instnace (_delete keyword)', function(done){
      var jobs = [];
      var person;

      jobs.push(function(next){
        person = new api.models.person();
        person.data.source = 'web';
        person.data.data = {a : 1};
        person.data.email = email();
        person.create(next);
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        person.data.data.a = '_delete';
        person.data.data.b = 2;
        person.edit(function(error){
          should.not.exist(error);
          next();
        });
      });

      jobs.push(function(next){ specHelper.refresh(next); });

      jobs.push(function(next){
        var p2 = new api.models.person(person.data.guid);
        p2.hydrate(function(error){
          should.not.exist(error);
          should.not.exist(p2.data.data.a);
          p2.data.data.b.should.equal(2);
          next();
        });
      });

      async.series(jobs, done);
    });

    it('can edit an instnace (blocked by uniqueFields)', function(done){
      var jobs = [];
      var person, person2;

      var e1 = email();
      var e2 = email();

      jobs.push(function(next){
        person = new api.models.person();
        person.data.source = 'web';
        person.data.email = e1;
        person.create(next);
      });

      jobs.push(function(next){
        person2 = new api.models.person();
        person2.data.source = 'web';
        person2.data.email = e2;
        person2.create(next);
      });

      jobs.push(function(next){ specHelper.ensureWrite(next); });

      jobs.push(function(next){
        person.data.email = e2;
        person.edit(function(error){
          error.message.should.containEql('uniqueFields:email uniqueness violated via #' + person2.data.guid);
          next();
        });
      });

      async.series(jobs, done);
    });
  });

});
