var execSync = require('child_process').execSync;
var path = require('path');
var sensor = {};

sensor.getCurrent = function() {
    var result = execSync('./sensor.py');
    return result.toString();
}

module.exports = sensor;