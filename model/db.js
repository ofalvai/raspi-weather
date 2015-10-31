var sqlite3 = require('sqlite3');

var db = {
    DB_PATH: './raspi-weather.db',
    connection: null,

    connect: function() {
        db.connection = new sqlite3.Database(db.DB_PATH);
    },

    errorHandler: function(err, res) {
        res.json({
            success: false,
            error: err.toString()
        });
    },

    getPast: function(hours, res) {
        db.connect();

        var hourString = -hours + ' hours';
        var stmt = db.connection.prepare(
            'SELECT timestamp, temperature, humidity FROM indoor WHERE timestamp >= datetime(?, ?, ?)',
            function(err) {
                if(err) {
                    db.errorHandler(err, res);
                }
            }
        );
        stmt.all(['now', 'localtime', hourString], function(err, rows) {
            if(err) {
                db.errorHandler(err, res);
            } else {
                res.json({
                    success: true,
                    data: rows
                });
            }
        });
    },

    getComparison: function(firstType, secondType, res) {
        db.connect();

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

        db.connection.serialize(function() {
            if(firstType === 'today') {
                var stmt = db.connection.prepare(
                    'SELECT timestamp, temperature, humidity FROM indoor WHERE timestamp >= datetime(?, ?, ?)',
                    function(err) {
                        if(err) {
                            db.errorHandler(err, res);
                        }
                    }
                );
                stmt.all(['now', 'localtime', 'start of day'], function(err, rows) {
                    if(err) {
                        db.errorHandler(err, res);
                    } else {
                        result.first.data = rows;
                        // The result is not yet ready,
                        // we'll return both in the second query callback
                        // (the queries are serialized)
                    }
                });
            }

            if(secondType === 'yesterday') {
                var stmt = db.connection.prepare(
                    'SELECT timestamp, temperature, humidity\
                    FROM indoor WHERE timestamp >= datetime($now, $timezone, $start, $minus)\
                    AND timestamp <= datetime($now, $timezone, $start)',
                    function(err) {
                        if(err) {
                            db.errorHandler(err, res);
                        }
                    }
                );
                stmt.all({
                    $now: 'now',
                    $timezone: 'localtime',
                    $start: 'start of day',
                    $minus: '-1 day'
                }, function(err, rows) {
                    if(err) {
                        db.errorHandler(err, res);
                    } else {
                        result.second.data = rows;
                        result.success = true;
                        res.json(result);
                    }
                });
            }
        });
    }
};

module.exports = db;
