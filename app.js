#!/usr/bin/env node

var http = require('http');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');

var routes = require('./routes/index');
var APIroutes = require('./routes/api');

var app = express();
var port = 3000;
app.set('port', port);

var server = http.createServer(app);
server.listen(port);

app.set('views', path.join(__dirname, 'public'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/api', APIroutes);


module.exports = app;
