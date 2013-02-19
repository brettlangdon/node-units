var path = require('path');
var fs = require('fs');
var numerizer = require('numerizer');

var types = {};

var conversion_regex = /^(.*?)\s([a-zA-Z]+)\sto\s([a-zA-Z]+)$/i;

var db_regex = /[a-zA-Z]+:\n([\s\t]+([a-zA-Z]+,?)+[\s\t]+[0-9.]+[a-zA-Z]+\n)+/g;
var unit_database = {};

var forms = [/s$/i, /es$/i, /ies$/i];

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
	var unit = value[1].toLowerCase();
	value = parseFloat(value[0]);

	names.forEach(function(name){
	    unit_database[section_name][name.toLowerCase()] = {'unit': unit,
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
    var section = unit_database[type.toLowerCase()];
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
    var variations = [unit];
    forms.forEach(function(form){
	if(unit.match(form)){
	    variations.push(unit.replace(form, ''));
	}
    });
    return variations;
};


var determine_type = function(variations){
    for(var i in types){
	for(var k in variations){
	    if(unit_database[types[i]][variations[k]] !== undefined){
		return {'type': types[i], 'unit': variations[k]};
	    }
	}
    }
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
    convert: function(str){
	var type, value, from, to, max_tries;

	var parts = conversion_regex.exec(str);
	if(parts == null){
	    throw 'Invalid conversion string: "' + str + '", expected "<value> <from_unit> to <to_unit>"';
	    return;
	}

	value = parseFloat(numerizer(parts[1]));
	var from_variations = get_variations(parts[2].toLowerCase());
	var to_variations = get_variations(parts[3].toLowerCase());

	var from_type = determine_type(from_variations);
	var to_type = determine_type(to_variations);

	if(!from_type){
	    throw 'Unknown unit: "' + parts[2] + '"';
	    return;
	}
	if(!to_type){
	    throw 'Unknown unit: "' + parts[3] + '"';
	    return;
	}

	if(from_type.type !== to_type.type){
	    throw 'Units "' + from_type.unit + '" and "' + to_type.unit + '" do not belong in the same unit group';
	    return;
	}

	type = from_type.type;
	from = from_type.unit;
	to = to_type.unit;

        var result = convert(type, value, from, to, max_tries);
	if(result == undefined){
	    throw 'Conversion of "' + from + '" to "' + to + '" was not possible';
	} else{
	    return result;
	}
    },
};
