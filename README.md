Node Units
=========

A unit conversion library for Node.JS that comes with a default unit conversion database and the ability to extend the database with custom metrics.

## Installing

```bash
npm install node-units
```

## Usage

### Functions
* `importDB(file_name, cb)` - imports a custom unit database, `cb` takes a single argument `err`
* `importDBSync(file_name)` - the sync version of `importDB`
* `getDB()` - returns he currently used database of units as an object
* `convert(conversion_string)` - where `conversion_string` is of the form `<value> <from_unit> to <to_unit>`

### Properties
* `types` - `types` is an object containing constants for each unit group.

`types` with the default unit database looks like:
```javascript
{'TIME': 'time',
 'VOLUME': 'volume'};
```

### Simple Usage

```javascript
var units = require('node-units');

var result = units.convert('5 gills to mL');
// result == 591.4705

units.convert('five days to seconds');
```

### Custom Units

With `node-units` you can import custom unit definitions from files defined like the following:
```
group:
  longname,longname,ln    1ln
  anotherunit,au          5ln
  onemore,om              2au
```

```javascript
var units = require('node-units');

units.importDBSync('my_custom.units');

var result = units.convert('five au to onemores');
// result == 10
```

With custom units you can also overwrite any previously defined units.

```
time:
  minute,m		50s
```

```javascript
var units = require('node-units');

units.importDBSync('my_custom.units');

var result = units.convert('5 minutes to s');
// result == 250
```

## License

The MIT License (MIT)
Copyright (c) 2013 Brett Langdon

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
