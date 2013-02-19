var units = require('../../');

console.dir(units.getUnitType('gallons'));
console.dir(units.getUnitType('milliliters'));

var result = units.convert('20 quarts to gallons');
console.log(result === 5);

try{
    var value = units.convert('5 days to gallon');
    console.log(value);
} catch(e){
    console.log(e);
}
