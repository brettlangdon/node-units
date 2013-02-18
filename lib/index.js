var path = require('path');
var fs = require('fs');

var types = {};

var db_regex = /[a-zA-Z]+:\n([\s\t]+([a-zA-Z]+,?)+[\s\t]+[0-9.]+[a-zA-Z]+\n)+/g;
var unit_database = {};

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



var default_db = path.join(path.dirname(module.filename), 'default.units');
importDBSync(default_db);

return module.exports = {
    types: types,
    importDBSync: importDBSync,
    importDB: importDB,
    getDB: function(){
	return unit_database;
    },
    convert: function(type, value, from, to){
	type = type.toLowerCase();

	if(unit_database[type] == undefined){
	    throw 'Unit group ' + type + ' does not exist';
	} else if(unit_database[type][from] == undefined){
	    throw 'Unit ' + from + ' does not belong to unit group ' + type;
	} else if(unit_database[type][to] == undefined){
	    throw 'Unit ' + to + ' does not belong to unit group ' + type;
	}

	var result = convert(type, value, from, to, 5);
	if(result == undefined){
	    throw 'Conversion of ' + from + ' to ' + to + ' was not possible';
	} else{
	    return result;
	}
    },
};
