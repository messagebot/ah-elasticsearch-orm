# ah-elasticsearch-orm
An Elasticsearch ORM for [ActionHero](http://www.actionherojs.com)

## Migrations

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
