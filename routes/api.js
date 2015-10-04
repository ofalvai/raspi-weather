var express = require('express');
var router = express.Router();
var sensor = require('../model/sensor');
var db = require('../model/db');

/* GET current sensor data. */
router.get('/current', function(req, res) {
    res.json(sensor.getCurrent());
});

/* GET past 24h */
router.get('/past/24h', function(req, res) {
    // Callback...
    db.getPast(24, res);
});

/* GET past week */
router.get('/past/week', function(req, res) {
    db.getPast(24*7, res);
});

/* GET past month */
router.get('/past/month', function(req, res) {
    db.getPast(24*30, res);
});

/* GET yesterday vs today */
router.get('/compare/today/yesterday', function(req, res) {
    db.getComparison('today', 'yesterday', res);
});

module.exports = router;
