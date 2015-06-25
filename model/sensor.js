var execSync = require('child_process').execSync;
var path = require('path');
var sensor = {};

sensor.getCurrent = function() {
    var result = execSync('./sensor.py').toString().split(';');
    return { temperature: result[0], humidity: result[1] };
    
}

module.exports = sensor;