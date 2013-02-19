var path = require('path');
var units = require('../../');

var db = path.join(path.dirname(module.filename), 'my_custom.units');
units.importDBSync(db);

console.log(units.convert('5 buttons to widgets'));


console.log(units.convert('30 jings to jong'));
