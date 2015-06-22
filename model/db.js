var sqlite3 = require('sqlite3');
var weatherDB = new sqlite3.Database('./raspi-weather-test.db');
var db = {};

db.getPast = function(hours, res) {
    var hourString = -hours + ' hours';

    var stmt = weatherDB.prepare(
        'SELECT * FROM indoor WHERE timestamp >= datetime(?, ?, ?)'
    );
    stmt.all(['now', 'localtime', hourString], function(err, rows) {
        res.json(rows);
    });
}

db.getComparison = function(firstType, secondType, res) {
    var result = {
        first: {
            type: firstType,
            data: []
        },
        second: {
            type: secondType,
            data: []
        }
    };

    weatherDB.serialize(function() {
        if(firstType == 'today') {
            var stmt = weatherDB.prepare(
                'SELECT * FROM indoor WHERE timestamp >= datetime(?, ?, ?)'
            );
            stmt.all(['now', 'localtime', 'start of day'], function(err, rows) {
                result.first.data = rows;
                // The result is not yet ready, we'll return both in the second query callback
                // (the queries are serialized)
            });
        }

        if(secondType == 'yesterday') {
            var stmt = weatherDB.prepare(
                'SELECT * FROM indoor WHERE timestamp >= datetime($now, $timezone, $start, $minus)'
                + 'AND timestamp <= datetime($now, $timezone, $start)'
            );
            stmt.all({
                $now: 'now',
                $timezone: 'localtime',
                $start: 'start of day',
                $minus: '-1 day'
            }, function(err, rows) {
                result.second.data = rows;
                res.json(result);
            });
        }        
    });
}

module.exports = db;
