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

## Aggregations

## Schema

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

### Special Keys:
- On an instance, setting a key to `_delete` will remove it, IE: `person.data.email = '_delete'; person.edit();`
- On a search or aggregation, setting a searchKey to `_exists` will will search for simply the presence of that key
- On a search or aggregation, setting a searchKey to `_missing` will will search for simply the missing status of that key

### Notes:
- `api.models` is where constructors for instances live, ie: `new api.models.person()`
- `guid` is a unique primary key for all instances, and it is set to `_id` for the elasticsearch instance.
- By default, all instances are expected to have a `createdAt` and `updatedAt` property at the top of the schema details.
