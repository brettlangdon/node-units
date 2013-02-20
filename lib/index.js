var path = require('path');
var fs = require('fs');
var numerizer = require('numerizer');

var types = {};

var conversion_regex = /^(.*?)\s([a-zA-Z]+)\sto\s([a-zA-Z]+)$/i;

var db_regex = /[a-zA-Z]+:\n([\s\t]+([a-zA-Z]+,?)+[\s\t]+[0-9.]+[a-zA-Z]+\n)+/g;
var unit_database = {};

var forms = [/s$/i, /es$/i, /ies$/i];

var short_prefixes = [
    {'pattern': /^da/,
     'modifier': 10},
    {'pattern': /^mu/,
     'modifier': 1e-6},
    {'pattern': /^m/,
     'modifier': 1e-3},
    {'pattern': /^h/,
     'modifier': 100},
    {'pattern': /^k/,
     'modifier': 1000},
    {'pattern': /^M/,
     'modifier': 1e6},
    {'pattern': /^G/,
     'modifier': 1e9},
    {'pattern': /^T/,
     'modifier': 1e12},
    {'pattern': /^P/,
     'modifier': 1e15},
    {'pattern': /^E/,
     'modifier': 1e18},
    {'pattern': /^Z/,
     'modifier': 1e21},
    {'pattern': /^Y/,
     'modifier': 1e24},
    {'pattern': /^n/,
     'modifier': 1e-9},
    {'pattern': /^p/,
     'modifier': 1e-12},
    {'pattern': /^c/,
     'modifier': 1e-2},
    {'pattern': /^d/,
     'modifier': 1e-1},
    {'pattern': /^f/,
     'modifier': 1e-15},
    {'pattern': /^a/,
     'modifier': 1e-18},
    {'pattern': /^z/,
     'modifier': 1e-21},
    {'pattern': /^y/,
     'modifier': 1e-24},
];

var long_prefixes = [
    {'pattern': /^milli/i,
     'modifier': 1e-3},
    {'pattern': /^micro/i,
     'modifier': 1e-6},
    {'pattern': /^nano/i,
     'modifier': 1e-9},
    {'pattern':  /^pico/i,
     'modifier': 1e-12},
    {'pattern': /^centi/i,
     'modifier': 1e-2},
    {'pattern': /^deci/i,
     'modifier': 1e-1},
    {'pattern': /^femto/i,
     'modifier': 1e-15},
    {'pattern': /^atto/i,
     'modifier': 1e-18},
    {'pattern': /^zepto/i,
     'modifier': 1e-21},
    {'pattern': /^yocto/i,
     'modifier': 1e-24},
    {'pattern': /^deka/i,
     'modifier': 10},
    {'pattern': /^hecto/i,
     'modifier': 100},
    {'pattern': /^kilo/i,
     'modifier': 1000},
    {'pattern': /^mega/i,
     'modifier': 1e6},
    {'pattern': /^giga/i,
     'modifier': 1e9},
    {'pattern': /^tera/i,
     'modifier': 1e12},
    {'pattern': /^peta/i,
     'modifier': 1e15},
    {'pattern': /^exa/i,
     'modifier': 1e18},
    {'pattern': /^zeta/i,
     'modifier': 1e21},
    {'pattern': /^yotta/i,
     'modifier': 1e24},
];

var parseSection = function(section){
    var lines = section.split('\n');
    var section_name = lines.shift();
    section_name = section_name.replace(/[\r\n\t\s:]/g, '').toLowerCase();
    if(!unit_database[section_name]){
	types[section_name.toUpperCase()] = section_name;
	unit_database[section_name] = {};
    }

    while(lines.length){
	var next = lines.shift().split(/\t+/g);
	if(next.length != 2){
	    continue;
	}

	var names = next[0].replace(/[\s\t]/g, '').split(',');
	var value = next[1].replace(/[\s\t]/g, '').match(/([0-9.]+)|([a-zA-Z]+)/g);
	var unit = value[1];
	value = parseFloat(value[0]);

	names.forEach(function(name){
	    unit_database[section_name][name] = {'unit': unit,
						 'value': value};
	});
    }
};

var importDBSync = function(file_name){
    var fp = fs.readFileSync(file_name).toString();
    var parts = fp.match(db_regex);
    parts.forEach(parseSection);
};

var importDB = function(file_name, cb){
    fs.readFile(file_name, function(err, fp){
	if(!err){
	    var parts = fp.toString().match(db_regex);
	    parts.forEach(parseSection);
	}

	if(cb != undefined){
	    cb(err);
	}
    });
};

var convert = function(type, value, from, to, max_calls){
    if(max_calls <= 0){
	return undefined;
    }
    var section = unit_database[type];
    if(!section){
	return undefined;
    }
    var from_base = section[from];
    var to_base = section[to];
    if(from_base == undefined || to_base == undefined){
	return undefined;
    }

    if(from_base.unit == to){
	return value * from_base.value;
    } else if(to_base.unit == from_base.unit){
	return (value * from_base.value / to_base.value);
    } else{
	var result = convert(type, from_base.value, from_base.unit, to, max_calls - 1);
	if(result == undefined || result == null || result == NaN){
	    return undefined;
	} else{
	    return value * result;
	}
    }
};


var get_variations = function(unit){
    if(unit == null || unit == undefined){
	return [];
    }

    var variations = [unit];
    if(unit.length == 2){
	return variations;
    }

    forms.forEach(function(form){
	if(unit.match(form)){
	    variations.push(unit.replace(form, ''));
	}
    });
    return variations;
};


var get_modifier = function(unit){
    var prefixes = short_prefixes;
    if(unit.length > 3){
	prefixes = long_prefixes;
    }
    for(var i in prefixes){
	var prefix = prefixes[i];
	if(unit.match(prefix.pattern)){
	    return {'unit': unit.replace(prefix.pattern, ''),
		    'modifier': prefix.modifier};
	}
    }
    return {'unit': unit,
	    'modifier': 1};
};

var determine_type = function(variations){
    var possible = [];
    for(var i in types){
	for(var k in variations){
	    if(unit_database[types[i]][variations[k]] !== undefined){
		possible.push({'type': types[i], 'unit': variations[k], 'modifier': 1});
	    } else{
		var modified = get_modifier(variations[k]);
		if(unit_database[types[i]][modified.unit] !== undefined){
		    possible.push({'type': types[i], 'unit': modified.unit, 'modifier': modified.modifier});
		}
	    }
	}
    }
    return possible;
};

var default_db = path.join(path.dirname(module.filename), 'default.units');
importDBSync(default_db);

return module.exports = {
    types: types,
    importDBSync: importDBSync,
    importDB: importDB,
    getDB: function(){
	return unit_database;
    },
    getUnitType: function(unit){
	var types = determine_type(get_variations(unit));
	if(!types){
	    return null;
	}

	return types;
    },
    convert: function(str){
	var value, from, to;
	var max_tries = 5;

	var parts = conversion_regex.exec(str);
	if(parts == null){
	    throw 'Invalid conversion string: "' + str + '", expected "<value> <from_unit> to <to_unit>"';
	    return;
	}

	value = parseFloat(numerizer(parts[1]));
	var from_variations = get_variations(parts[2]);
	var to_variations = get_variations(parts[3]);

	var from_types = determine_type(from_variations);
	var to_types = determine_type(to_variations);

	if(!from_types.length){
	    throw 'Unknown unit: "' + parts[2] + '"';
	    return;
	}
	if(!to_types.length){
	    throw 'Unknown unit: "' + parts[3] + '"';
	    return;
	}

	for(var i in from_types){
	    for(var k in to_types){
		if(from_types[i].type === to_types[k].type){
		    from = from_types[i];
		    to = to_types[k];
		    break;
		}
	    }
	}

	if(!from || !to){
	    throw 'Units "' + parts[2] + '" and "' + parts[3] + '" do not belong in the same unit group';
	    return;
	}

	value = value * from.modifier;
        var result = convert(from.type, value, from.unit, to.unit, max_tries);
	if(result == undefined){
	    throw 'Conversion of "' + from.unit + '" to "' + to.unit + '" was not possible';
	} else{
	    return result / to.modifier;
	}
    },
};
