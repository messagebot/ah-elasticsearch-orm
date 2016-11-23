var async = require('async')
var should = require('should')
var dateformat = require('dateformat')
var path = require('path')
var specHelper = require(path.join(__dirname, '/specHelper.js')).specHelper
var index = 'test-people-' + dateformat(new Date(), 'yyyy-mm')
var api

describe('ah-elasticsearch-orm', function () {
  describe('instances', function () {
    before(function () { api = specHelper.api })

    before(function (done) {
      specHelper.doBash('NODE_ENV=test cd ' + specHelper.testDir + '  && ./node_modules/ah-elasticsearch-orm/bin/ah-elasticsearch-orm migrate', done, true)
    })

    it('can create and hydrate an instnace (simple)', function (done) {
      var jobs = []
      var person

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.source = 'web'
        person.data.email = specHelper.email()
        person.create(function (error) {
          should.not.exist(error)
          person.data.guid.should.exist
          next()
        })
      })

      jobs.push(function (next) {
        var p2 = new api.models.Person(person.data.guid)
        p2.hydrate(function (error) {
          should.not.exist(error)
          p2.type.should.equal('Person')
          p2.index.should.equal(index)
          p2.alias.should.equal('test-people')
          dateformat(p2.data.createdAt, 'yyyy-mm-dd').should.equal(dateformat(new Date(), 'yyyy-mm-dd'))
          dateformat(p2.data.updatedAt, 'yyyy-mm-dd').should.equal(dateformat(new Date(), 'yyyy-mm-dd'))
          next()
        })
      })

      async.series(jobs, done)
    })

    it('will not create an instance with missing required params', function (done) {
      var person = new api.models.Person()
      person.create(function (error) {
        error.message.should.equal('source is a required field')
        done()
      })
    })

    it('can create and hydrate an instnace (complex data)', function (done) {
      var jobs = []
      var person

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.source = 'web'
        person.data.email = specHelper.email()
        person.data.createdAt = new Date(100)
        person.data.data = {
          thing: 'stuff',
          nested: {deep: true},
          timestamp: new Date(100)
        }
        person.create(function (error) {
          should.not.exist(error)
          person.data.guid.should.exist
          next()
        })
      })

      jobs.push(function (next) {
        var p2 = new api.models.Person(person.data.guid)
        p2.hydrate(function (error) {
          should.not.exist(error)
          p2.type.should.equal('Person')
          p2.index.should.equal(index)
          p2.alias.should.equal('test-people');
          (p2.data.createdAt.getTime()).should.equal((new Date(100)).getTime()) // custom createdAt
          dateformat(p2.data.updatedAt, 'yyyy-mm-dd').should.equal(dateformat(new Date(), 'yyyy-mm-dd'))

          // custom data properties
          p2.data.data.thing.should.equal('stuff')
          p2.data.data.nested.deep.should.equal(true);
          // hydrated timetamps properly
          (p2.data.data.timestamp.getTime()).should.equal((new Date(100)).getTime())

          next()
        })
      })

      async.series(jobs, done)
    })

    it('can create an instance with a provided guid', function (done) {
      var jobs = []
      var person
      var guid = 'abc123' + new Date().getTime()

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.guid = guid
        person.data.source = 'web'
        person.data.email = specHelper.email()
        person.create(function (error) {
          should.not.exist(error)
          person.data.guid.should.equal(guid)
          next()
        })
      })

      jobs.push(function (next) {
        var p2 = new api.models.Person(guid)
        p2.hydrate(function (error) {
          should.not.exist(error)
          p2.data.guid.should.equal(guid)
          next()
        })
      })

      async.series(jobs, done)
    })

    it('can save top-level but non-required data', function (done) {
      var jobs = []
      var person

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.source = 'web'
        person.data.name = 'Evan'
        person.data.email = specHelper.email()
        person.create(function (error) {
          should.not.exist(error)
          next()
        })
      })

      jobs.push(function (next) {
        api.models.Person(person.data.guid)
        person.hydrate(function (error) {
          should.not.exist(error)
          person.data.name.should.equal('Evan')
          next()
        })
      })

      async.series(jobs, done)
    })

    it('will fail when creating a duplicte instance by guid', function (done) {
      var jobs = []
      var person, person2

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.source = 'web'
        person.data.email = specHelper.email()
        person.create(function (error) {
          should.not.exist(error)
          next()
        })
      })

      jobs.push(function (next) {
        person2 = new api.models.Person()
        person2.data.guid = person.data.guid
        person2.data.source = 'web'
        person2.data.email = 'a@fake.com'
        person2.create(function (error) {
          error.message.should.equal('uniqueFields:guid uniqueness violated via #' + person.data.guid)
          next()
        })
      })

      async.series(jobs, done)
    })

    it('#create will fail is uniqueFields is violated', function (done) {
      var jobs = []
      var person, person2
      var e = specHelper.email()
      // var e = 'blockingemail@fake.com';

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.email = e
        person.data.source = 'web'
        person.create(function (error) {
          should.not.exist(error)
          next()
        })
      })

      jobs.push(function (next) {
        person2 = new api.models.Person()
        person2.data.email = e
        person2.data.source = 'web'
        person2.create(function (error) {
          error.message.should.containEql('uniqueFields:email uniqueness violated via')
          next()
        })
      })

      async.series(jobs, done)
    })

    it('can delete an instnace', function (done) {
      var jobs = []
      var person

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.source = 'web'
        person.data.email = 'a@fake.com'
        person.create(next)
      })

      jobs.push(function (next) {
        person.del(function (error) {
          should.not.exist(error)
          next()
        })
      })

      jobs.push(function (next) {
        person.hydrate(function (error) {
          error.message.should.equal('Person (' + person.data.guid + ') not found')
          next()
        })
      })

      async.series(jobs, done)
    })

    it('can delete an un-hydrated instnace', function (done) {
      var jobs = []
      var person

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.source = 'web'
        person.data.email = 'a@fake.com'
        person.create(next)
      })

      jobs.push(function (next) {
        var p2 = new api.models.Person(person.data.guid)
        p2.del(function (error) {
          should.not.exist(error)
          next()
        })
      })

      jobs.push(function (next) {
        person.hydrate(function (error) {
          error.message.should.equal('Person (' + person.data.guid + ') not found')
          next()
        })
      })

      async.series(jobs, done)
    })

    it('can edit an instnace (simple)', function (done) {
      var jobs = []
      var person

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.source = 'web'
        person.data.email = specHelper.email()
        person.create(next)
      })

      jobs.push(function (next) {
        person.data.source = 'iphone'
        person.edit(function (error) {
          should.not.exist(error)
          next()
        })
      })

      jobs.push(function (next) {
        var p2 = new api.models.Person(person.data.guid)
        p2.hydrate(function (error) {
          should.not.exist(error)
          p2.data.source.should.equal('iphone')
          next()
        })
      })

      async.series(jobs, done)
    })

    it('can edit an instnace (with delay for uniqueFiled check)', function (done) {
      var jobs = []
      var person

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.source = 'web'
        person.data.email = specHelper.email()
        person.create(next)
      })

      jobs.push(function (next) {
        person.data.source = 'iphone'
        person.edit(function (error) {
          should.not.exist(error)
          next()
        })
      })

      async.series(jobs, done)
    })

    it('can edit an instnace (_delete keyword)', function (done) {
      var jobs = []
      var person

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.source = 'web'
        person.data.data = {a: 1}
        person.data.email = specHelper.email()
        person.create(next)
      })

      jobs.push(function (next) {
        person.data.data.a = '_delete'
        person.data.data.b = 2
        person.edit(function (error) {
          should.not.exist(error)
          next()
        })
      })

      jobs.push(function (next) {
        var p2 = new api.models.Person(person.data.guid)
        p2.hydrate(function (error) {
          should.not.exist(error)
          should.not.exist(p2.data.data.a)
          p2.data.data.b.should.equal(2)
          next()
        })
      })

      async.series(jobs, done)
    })

    it('can edit an instnace (blocked by uniqueFields)', function (done) {
      var jobs = []
      var person, person2

      var e1 = specHelper.email()
      var e2 = specHelper.email()

      jobs.push(function (next) {
        person = new api.models.Person()
        person.data.source = 'web'
        person.data.email = e1
        person.create(next)
      })

      jobs.push(function (next) {
        person2 = new api.models.Person()
        person2.data.source = 'web'
        person2.data.email = e2
        person2.create(next)
      })

      jobs.push(function (next) {
        person.data.email = e2
        person.edit(function (error) {
          error.message.should.containEql('uniqueFields:email uniqueness violated via #' + person2.data.guid)
          next()
        })
      })

      async.series(jobs, done)
    })
  })
})
