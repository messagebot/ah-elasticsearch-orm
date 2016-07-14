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

  after(function(done){
    specHelper.stop(done);
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

});
