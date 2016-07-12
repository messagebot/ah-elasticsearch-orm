# ah-elasticsearch-orm
An Elasticsearch ORM for [ActionHero](http://www.actionherojs.com)

## Migrations and Defintions.
This tool will run migrations creating a new index for every month based on your definitions.  We will also apply an alias to each index in the group.  This allows you to easily scale your indexes, and have fine-grained control over deleting old data.  You define where your index definitions are located in your project via `api.config.elasticsearch.indexDefinitions`.

For example, if you wanted to create a `"people"` index for your project, you might have:

```js
// from ./db/elasticsearch/people.json

module.exports = {
  "settings": {
    "number_of_shards": parseInt(process.env.NUMBER_OF_SHARDS || 10),
    "number_of_replicas": parseInt(process.env.NUMBER_OF_REPLICAS || 0),
    "index":{
        "analysis":{
           "analyzer":{
              "analyzer_keyword":{
                 "tokenizer":"keyword",
                 "filter":"lowercase"
              }
           }
        }
     }
  },

  "mappings": {
    "person": {

      "dynamic_templates": [
        {
          "strings": {
            "match_mapping_type": "string",
            "mapping": {
              "type": "string",
              "analyzer":"analyzer_keyword",
            }
          }
        }
      ],

      "properties": {
        "guid":        { "type": "string"  },
        "source":      { "type": "string"  },
        "data":        { "type": "object" },

        "location":    {
          "type": "geo_point",
          "geohash_precision": (process.env.GEOHASH_PRECISION || "1km")
        },

        "createdAt":   { "type":  "date" },
        "updatedAt":   { "type":  "date" }
      }
    }
  },

  "warmers" : {},

  "aliases" : {"people": {}}
};
```

Note the use of environment variables: `GEOHASH_PRECISION`, `NUMBER_OF_SHARDS` and `NUMBER_OF_SHARDS`.  This allows you to have a simple index when developing/staging, but have a more complex deployment in production.  You can also define custom analyzers, etc.  
The name of your index will be sourced from the file.  In the example above, the index created would be of the form `development-people-2016-07` (`api.env + '-' + name + '-' + thisMonth`).

It is safe to run the migration more than once, as indexes which already exist will be skipped.
```
> npm run migrate

> my-app@0.0.1 migrate:elasticsearch /Users/evan/PROJECTS/my-app
> ah-elasticsaerch migrate

 -> index: development-people-2016-07 already exists
 -> creating index: development-people-2016-08
```

From within your project, you can run `./node_modules/.bin/ah-elasticsaerch migrate` to run migrateion.  You can also make a short hand for this in your `scripts` section of your `package.json`, ie:
```json
"scripts": {
    "help": "actionhero help",
    "start": "actionhero start",
    "actionhero": "actionhero",
    "startCluster": "actionhero startCluster",
    "console": "actionhero console",
    "test": "NODE_ENV=test npm run migrate && NODE_ENV=test mocha",
    "migrate": "ah-elasticsaerch migrate",
  }
```

## Instances

Instances take the form:

```json
{
  "guid": "abc123",
  "createdAt": "123",
  "updatedAt": "456",
  "data":{
    "firstName": "Evan",
    "lastName": "Tahler",
  }
}
```

Top level properties end up defined at the top level of the ElasticSearch instance's `_source`.  Anything else can be added to `_source.data`.  This allows some parts of your schema to be flexible **and** other parts to have a rigid type and schema.  Top level properties are required when creating a new instance.

### Create
Persists an instance to the database.  

Note: If you provide a guid that already exists in the database, the `create` command will be changed to `edit`.  To match as loosely as possible, we'll only work with the first matching param as defined in `api.config.elasticsearch.uniqueFields[type]`.

Example create action:

```js
exports.personCreate = {
  name:                   'person:create',
  description:            'person:create',
  outputExample:          {},
  middleware:             [],

  inputs: {
    guid:         { required: false },
    data:         { required: true  },
    source:       { required: true },
    createdAt:    {
      required: false,
      formatter: function(p){
        return new Date(parseInt(p));
      }
    },
  },

  run: function(api, data, next){
    var person = new api.models.person();
    if(data.params.guid){        person.data.guid = data.params.guid;               }
    if(data.params.source){      person.data.source = data.params.source;           }
    if(data.params.createdAt){   person.data.createdAt = data.params.createdAt;     }

    for(var i in data.params.data){
      if(person.data[i] === null || person.data[i] === undefined){
        person.data[i] = data.params.data[i];
      }
    }

    person.create(function(error){
      if(!error){ data.response.guid = person.data.guid; }
      return next(error);
    });
  }
};
```

### Edit
Edit an existing instance which is saved in the database.

Note: To delete a property in the `data` hash, you can use the key `_delete`/  See the "special keys" section for more information.

Example edit action:

```js
exports.personEdit = {
  name:                   'person:edit',
  description:            'person:edit',
  outputExample:          {},
  middleware:             [],

  inputs: {
    guid:         { required: true },
    source:       { required: false },
    data:         { required: true  },
  },

  run: function(api, data, next){
    var person = new api.models.person(data.params.guid);
    if(data.params.source){ person.data.source = data.params.source; }

    for(var i in data.params.data){ person.data[i] = data.params.data[i]; }

    person.edit(function(error){
      if(error){ return next(error); }
      data.response.person = person.data;
      return next();
    });
  }
};
```

### Hydrate
Load up data from ElasticSearch about an instance (view).

Example view action:

```js
exports.personView = {
  name:                   'person:view',
  description:            'person:view',
  outputExample:          {},
  middleware:             [],

  inputs: {
    guid: { required: true },
  },

  run: function(api, data, next){
    var person = new api.models.person(data.params.guid);
    person.hydrate(function(error){
      if(error){ return next(error); }
      data.response.person = person.data;
      return next();
    });
  }
};
```

### Del
Delete an instance from the database.

Example del action:

```js
exports.personDelete = {
  name:                   'person:delete',
  description:            'person:delete',
  outputExample:          {},
  middleware:             [],

  inputs: {
    guid: { required: true },
  },

  run: function(api, data, next){
    var person = new api.models.person(data.params.guid);
    // load the instance to be sure it exists
    person.hydrate(function(error){
      if(error){ return next(error); }
      person.del(next);
    });
  }
};

```

## Aggregations

### Aggregation
Return counts of instances based on keys you specify, over a date range.

`api.elasticsearch.aggregation(api, alias, searchKeys, searchValues, start, end, dateField, agg, aggField, interval, callback)`
- `api`: The API object.
- `alias`: The Alias (or specific index) you want to search in
- `searchKeys`: An array of keys you expect to search over.
- `searchValues`: An array of the values you want to exist for searchKeys.
- `start`: A Date object indicating the start range of dateField to search for.
- `end`: A Date object indicating the end range of dateField to search for.
- `dateField`: The name of the top-level date key to search over.
- `agg`: The name of the aggregation (From the [ElasticSearch API](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html))
- `aggField`: The name of the field to group over.
- `interval`: The resolution of the resulting buckets. See the "Notes" section for allowed intervals.
- `callback`: callback takes the form of `(error, data)`

An example to ask: "How many people whose names start with the letter "E" were created in the last month? Show me the answer in an hour resolution."

```js
api.elasticsearch.aggregation(
  api,
  'people',
  ['guid', 'data.firstName'],
  ['_exists', 'e*'],
  ( new Date().setDate(today.getDate()-30) ),
  ( new Date() ),
  'createdAt',
  'date_histogram',
  'createdAt',
  'hour',
  callback
);
```

### Distinct
Count up the unique instances grouped by the key you specify

`api.elasticsearch.distinct(api, alias, searchKeys, searchValues, start, end, dateField, field, callback)`
- `api`: The API object.
- `alias`: The Alias (or specific index) you want to search in
- `searchKeys`: An array of keys you expect to search over.
- `searchValues`: An array of the values you want to exist for searchKeys.
- `start`: A Date object indicating the start range of dateField to search for.
- `end`: A Date object indicating the end range of dateField to search for.
- `dateField`: The name of the top-level date key to search over.
- `field`: The field that we want to count unique instances of.
- `callback`: callback takes the form of `(error, data)`

An example to ask: "How many people whose names start with the letter "E" were created in the last month? Show me how many unique firstNames there are."

```js
api.elasticsearch.distinct(
  api,
  'people',
  ['guid', 'data.firstName'],
  ['_exists', 'e*'],
  ( new Date().setDate(today.getDate()-30) ),
  ( new Date() ),
  'createdAt',
  'data.firstName',
  callback
);
```

### Mget
Return the hydrated results from an array of guids.

`api.elasticsearch.mget(api, alias, ids, callback)`
- `api`: The API object.
- `alias`: The Alias (or specific index) you want to search in
- `ids`: An array of GUIDs
- `callback`: callback takes the form of `(error, data)`

An example to ask: "Hydrate these guids: aaa, bbb, ccc"

```js
api.elasticsearch.mget(
  api,
  'people',
  ['aaa', 'bbb', 'ccc'],
  callback
);
```

### Scroll
Load all results (regardless of pagination) which match a specific ElasticSearch query.

`api.elasticsearch.scroll(api, alias, query, fields, callback)`
- `api`: The API object.
- `alias`: The Alias (or specific index) you want to search in
- `query`: The ElasticSearch query to return the results of
- `fields`: The fields to return (or `*`)
- `callback`: callback takes the form of `(error, data)`

An example to ask: "How many people have the firstName Evan? Get me all of their email addresses."

```js
api.elasticsearch.scroll(
  api,
  'people',
  {"bool": {"must": [{"term": {"data.firstName": "evan"}}]}}
  ['data.email'],
  callback
);
```

### Search
Preform a paginated ElasticSearch query, returning the total results and the requested ordered and paginated segment.

`api.elasticsearch.search(api, alias, searchKeys, searchValues, from, size, sort, callback)`
- `api`: The API object.
- `alias`: The Alias (or specific index) you want to search in
- `searchKeys`: An array of keys you expect to search over.
- `searchValues`: An array of the values you want to exist for searchKeys.
- `from`: The starting ID of the result set (offset).
- `size`: The number of results to return (limit).
- `sort`: How to order the result set (From the [ElasticSearch API](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html)).
- `callback`: callback takes the form of `(error, data)`

An example to ask: "Show me instances #50-#100 of people whose first names start with the letter E.  Sort them by createdAt"

```js
api.elasticsearch.search(
  api,
  'people',
  ['guid', 'data.firstName'],
  ['_exists', 'e*'],
  50,
  50,
  { "createdAt" : {"order" : "asc"}}
  callback
);
```

## Special Keys:
- On an instance, setting a key to `_delete` will remove it, IE: `person.data.email = '_delete'; person.edit();`
- On a search or aggregation, setting a searchKey to `_exists` will will search for simply the presence of that key (`searchKeys` and `searchValues`).
- On a search or aggregation, setting a searchKey to `_missing` will will search for simply the missing status of that key (`searchKeys` and `searchValues`).

## Notes:
- `api.models` is where constructors for instances live, ie: `new api.models.person()`
- `guid` is a unique primary key for all instances, and it is set to `_id` for the elasticsearch instance.
- By default, all instances are expected to have a `createdAt` and `updatedAt` property at the top of the schema details.
- For aggregations, the interval/format map is:
```js
var format = 'yyyy-MM-dd';
if(interval === 'year'){        format = 'yyyy';                }
else if(interval === 'month'){  format = 'yyyy-MM';             }
else if(interval === 'week'){   format = 'yyyy-MM-dd';          }
else if(interval === 'day'){    format = 'yyyy-MM-dd';          }
else if(interval === 'hour'){   format = 'yyyy-MM-dd HH:00';    }
else if(interval === 'minute'){ format = 'yyyy-MM-dd HH:mm';    }
else if(interval === 'second'){ format = 'yyyy-MM-dd HH:mm:ss'; }
```
