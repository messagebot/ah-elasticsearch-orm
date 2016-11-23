var os = require('os')
var path = require('path')
var async = require('async')
var exec = require('child_process').exec

var specHelper = {
  // testDir: '/tmp/ah-elasticsearch-orm',
  testDir: os.tmpDir() + '/ah-elasticsearch-orm',
  projectDir: path.normalize(path.join(__dirname, '..')),
  built: false,

  doBash: function (commands, callback, silent) {
    if (!silent) { silent = false }
    if (!Array.isArray(commands)) { commands = [commands] }
    var fullCommand = '/bin/bash -c \'' + commands.join(' && ') + '\''
    if (!silent) { console.log('>> ' + fullCommand) }
    exec(fullCommand, function (error, data) {
      callback(error, data)
    })
  },

  build: function (callback) {
    var self = this
    var jobs = []
    var commands = [
      'rm -rf ' + this.testDir,
      'mkdir -p ' + this.testDir,
      'cd ' + this.testDir + ' && npm install actionhero',
      'cd ' + this.testDir + ' && ./node_modules/.bin/actionhero generate',
      'cd ' + this.testDir + ' && npm install',
      'rm -f ' + this.testDir + '/node_modules/ah-elasticsearch-orm',
      'ln -s ' + this.projectDir + ' ' + this.testDir + '/node_modules/ah-elasticsearch-orm',
      'cd ' + this.testDir + ' && npm run actionhero -- link --name ah-elasticsearch-orm',
      'mkdir -p ' + this.testDir + '/db/elasticsearch/indexes',
      'cp ' + this.projectDir + '/test/db/elasticsearch/indexes/people.js ' + this.testDir + '/db/elasticsearch/indexes/people.js'
    ]

    if (process.env.SKIP_BUILD !== 'true') {
      jobs.push(function (done) { console.log('-------- BUILDING PROJECT --------'); done() })
      jobs.push(function (done) { console.log('  In the future, you can skip the build with `SKIP_BUILD=true`\r\n'); done() })
      commands.forEach(function (cmd) {
        jobs.push(function (done) { self.doBash(cmd, done) })
      })
      jobs.push(function (done) { console.log('-------- BUILD COMPLETE --------\r\n'); done() })
    }

    jobs.push(function (done) {
      self.built = true
      done()
    })

    async.series(jobs, callback)
  },

  buildOnce: function (callback) {
    var self = this
    if (self.built === false) {
      self.build(callback)
    } else {
      return callback()
    }
  },

  start: function (callback) {
    var self = this
    var ActionheroPrototype = require(self.testDir + '/node_modules/actionhero/actionhero.js')
    self.actionhero = new ActionheroPrototype()
    process.env.PROJECT_ROOT = self.testDir
    self.actionhero.start(function (error, a) {
      if (error) { throw error }
      self.api = a
      callback()
    })
  },

  stop: function (callback) {
    var self = this
    self.actionhero.stop(callback)
  },

  email: function () {
    var email = ''
    var possible = 'abcdefghijklmnopqrstuvwxyz0123456789'
    for (var i = 0; i < 10; i++) {
      email += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return email + '@fake.com'
  }
}

before(function (done) {
  this.timeout(1000 * 60)
  specHelper.buildOnce(done)
})

/* --- Start up the server --- */
before(function (done) { specHelper.start(done) })
after(function (done) { specHelper.stop(done) })

exports.specHelper = specHelper
