var async      = require('async');
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

  // after(function(done){
  //   specHelper.stop(done);
  // });

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
          (p2.data.data.timestamp.getTime()).should.equal( (new Date(100)).getTime() );

          next();
        });
      });

      async.series(jobs, done);
    });

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
