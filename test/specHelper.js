var os    = require('os');
var path  = require('path');
var async = require('async');
var exec  = require('child_process').exec;

var specHelper = {
  // testDir: '/tmp/ah-elasticsearch-orm',
  testDir: os.tmpDir() + '/ah-elasticsearch-orm',
  projectDir: path.normalize(__dirname + '/..'),
  built: false,

  doBash: function(commands, callback, silent){
    if(!silent){ silent = false; }
    if(!Array.isArray(commands)){ commands = [commands]; }
    var fullCommand = '/bin/bash -c \'' + commands.join(' && ') + '\'';
    if(!silent){ console.log('>> ' + fullCommand); }
    exec(fullCommand, function(error, data){
      callback(error, data);
    });
  },

  build: function(callback){
    var self = this;
    var jobs = [];
    var packgeJSON = path.normalize(__dirname + '/../../bin/templates/package.json');
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
      'cp ' + this.projectDir + '/test/db/elasticsearch/indexes/people.js ' + this.testDir + '/db/elasticsearch/indexes/people.js',
    ];

    if(process.env.SKIP_BUILD !== 'true'){
      jobs.push(function(done){ console.log('-------- BUILDING PROJECT --------'); done(); })
      commands.forEach(function(cmd){
        jobs.push(function(done){ self.doBash(cmd, done); })
      });
      jobs.push(function(done){ console.log('-------- BUILD COMPLETE --------\r\n'); done(); })
    }

    jobs.push(function(done){
      self.built = true;
      done();
    })

    async.series(jobs, callback);
  },

  buildOnce: function(callback){
    var self = this;
    if(self.built === false){
      self.build(callback);
    }else{
      return callback();
    }
  },

  refresh: function(callback){
    var self = this;
    self.doBash('curl -X POST http://localhost:9200/_refresh?wait_for_ongoing', callback, true)
  },

  flush: function(callback){
    var self = this;
    self.doBash('curl -X POST http://localhost:9200/_flush?wait_for_ongoing', callback, true)
  },

  ensureWrite: function(callback){
    var self = this;
    async.series([
      function(done){ self.flush(done); },
      function(done){ self.refresh(done); },
      // TOOD: Why doesn't FLUSH + REFERSH force index to be in sync?
      function(done){ console.log('....................(sleeping for commit)'); done(); },
      function(done){ setTimeout(done, 10001) },
    ], callback);
},

  start: function(callback){
    var self = this;
    var actionheroPrototype = require(self.testDir + '/node_modules/actionhero/actionhero.js').actionheroPrototype;
    self.actionhero = new actionheroPrototype();
    process.env.PROJECT_ROOT = self.testDir;
    self.actionhero.start(function(error, a){
      self.api = a;
      callback();
    });
  },

  stop: function(callback){
    var self = this;
    self.actionhero.stop(callback);
  },

  email: function(){
    var email = '';
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < 10; i++ ){
      email += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return email + '@fake.com';
  },
};

before(function(done){
  this.timeout(1000 * 60);
  specHelper.buildOnce(done);
});

exports.specHelper = specHelper;
