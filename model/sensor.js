var execSync = require('child_process').execSync;
var path = require('path');
var sensor = {};

sensor.getCurrent = function() {
    var result = execSync('./sensor.py').toString().split('\n');
    if(result[0] == "error") {
        return {
            success: false,
            error: result[1]
        }
    } else {
        return {
            success: true,
            temperature: result[0],
            humidity: result[1]
        };
    }
}

module.exports = sensor;