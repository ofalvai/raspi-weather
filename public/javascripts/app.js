var config = {
    /**
     * Frequency of measurement in minutes
     * Note: it's only needed for the graph intervals, doesn't set the logging interval.
     * You have to edit your crontab for that.
     */
    measurementInterval: 30,

    /**
     * Coordinates for getting outside weather data from forecast.io
     * By default, location is determined by HTML5 geolocation,
     * but as a fallback it relies on manual coordinates.
     *
     * You can disable geolocation and provide coordinates if you want.
     */
    useGeoLocation: true,
    latitude: 47.51,
    longitude: 19.09,

    /**
     * Forecast.io API key.
     * Please don't abuse this. Be a good guy and request your own at http://developer.forecast.io
     */
    APIKey: '262d0436a1b2d47e7593f0bb41491b64',

    // Limits of the night plotband (the gray area on the graphs)
    nightStart: 0,
    nightEnd: 7
}

var globalHighchartsOptions = {
    chart: {
        type: 'spline',
        zoomType: 'x'
    },
    xAxis: {
        type: 'datetime',
        plotBands: [ ]
    },
    yAxis: [{
        title: {
            text: 'Temperature (°C)'
        },
        opposite: true
    },
    {
        title: {
            text: 'Humidity (%)'
        },
        min: 0,
        max: 100
    }],
    series: [{
            name: 'Temperature',
            yAxis: 0,
            data: [ ],
            lineWidth: 4,
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '°C'
            },
            color: '#F18324',
            zones: [{
                // 0-22: yellow
                value: 22,
                color: '#F1AE24'
            },
            {
                // 22-30: orange
                value: 30,
                color: '#F18324'
            },
            {
                // 30+: red
                value: 80,
                color: '#F7605C'
            }]
        },
        {
            name: 'Humidity',
            yAxis: 1,
            data: [],
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '%'
            },
            color: '#7C8FBF',
            dashStyle: 'shortdot'
        }
    ],
    legend: {
        align: 'right',
        verticalAlign: 'top',
        y: 20
    },
    tooltip: {
        shared: true,
        crosshairs: true
    },
    title: {
        text: '',
        style: {
            'font-weight': 'bold'
        }
    }
};

function loadChart(APICall, DOMtarget, moreOptions) {
    $.getJSON(APICall, function(json) {
        if(!json.success) {
            console.log(json.error);
            return;
        }

        if(json.data.length == 0) {
            console.log('No data.');
            return;
        }

        var options = $.extend(true, {}, globalHighchartsOptions, moreOptions);

        $.each(json.data, function(index, el) {
            // Populating the series
            options.series[0].data.push(el.temperature);
            options.series[1].data.push(el.humidity);

            // Computing plot bands for the night interval(s)
            var timeEpoch = Date.parse(el.timestamp + 'Z');
            // The above creates a timezone-correct UNIX epoch representation
            // of the timestamp, and we need a regular datetime object
            // to get hours and minutes.
            var time = new Date(el.timestamp);
            // Night start
            if(time.getHours() == config.nightStart && time.getMinutes() == 0) {
                options.xAxis.plotBands.push({
                    from: timeEpoch,
                    to: null, // will be stored later
                    color: '#f2f2f2'
                });
            }
            // Night end
            if(time.getHours() == config.nightEnd && time.getMinutes() == 0) {
                options.xAxis.plotBands[options.xAxis.plotBands.length-1].to = timeEpoch;
            }
        });

        // End the plotband if currently it's night
        var last = options.xAxis.plotBands.length - 1;
        if(options.xAxis.plotBands[last].to == null) {
            options.xAxis.plotBands[last].to = Date.parse(
                json.data[json.data.length-1].timestamp + 'Z'
            );
        }

        options.series[0].pointStart = Date.parse(json.data[0].timestamp + 'Z');
        // Ugly timezone hacking, because Date.parse() assumes UTC,
        // and the timestamp is in local timezone
        options.series[1].pointStart = Date.parse(json.data[0].timestamp + 'Z');
        options.series[0].pointInterval = config.measurementInterval * 1000 * 60;
        options.series[1].pointInterval = config.measurementInterval * 1000 * 60;

        $(DOMtarget).highcharts(options);
        $(document).trigger('chartComplete', APICall);
    });
}

function loadDoubleChart(APICall, DOMtarget, moreOptions) {
    $.getJSON(APICall, function(json) {
        if(!json.success) {
            console.log(json.error);
            return;
        }

        if(json.first.data.length == 0 || json.second.data.length == 0) {
            console.log('No data.');
            return;
        }

        // Make sure yesterday's data starts at 00:00
        var startTime = new Date(json.second.data[0].timestamp);
        if(startTime.getHours() !== 0) {
            console.log('Not enough data for yesterday. A full day\'s data is required for comparison');
            $(document).trigger('chartComplete', APICall);
            return;
        }

        var options = $.extend(true, {}, globalHighchartsOptions, moreOptions);

        // Add more series
        options.series.push({
            name: 'Temperature yesterday',
            yAxis: 0,
            data: [],
            lineWidth: 2,
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '°C'
            },
            color: '#F18324',
            zones: [{
                // 0-22: yellow
                value: 22,
                color: '#F1AE24'
            },
            {
                // 22-30: orange
                value: 30,
                color: '#F18324'
            },
            {
                // 30+: red
                value: 80,
                color: '#F7605C'
            }],
            dashStyle: 'shortdash'
        });

        options.series.push({
            name: 'Humidity yesterday',
            yAxis: 1,
            data: [],
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '%'
            },
            color: '#7C8FBF',
            dashStyle: 'shortdash',
            visible: false
        });

        $.each(json.first.data, function(index, el) {
            options.series[0].data.push(el.temperature);
            options.series[1].data.push(el.humidity);
        });
        $.each(json.second.data, function(index, el) {
            options.series[2].data.push(el.temperature);
            options.series[3].data.push(el.humidity);
        });

        options.series[1].visible = false;
        options.series[1].dashStyle = 'solid';
        options.tooltip.xDateFormat = '%H:%M';
        options.xAxis.labels = {
            format: '{value: %H:%M}'
        };

        for(var i = 0; i < options.series.length; i++) {
            // Just a dummy date object set to the beginning of a dummy day
            // Only the hours and minutes will be displayed
            options.series[i].pointStart = Date.parse('2015.01.01 00:00Z');
            options.series[i].pointInterval = config.measurementInterval * 1000 * 60;
        }

        // Converting the actual last timestamp to our dummy datetime object

        var lastTimestamp = new Date(json.first.data[json.first.data.length-1].timestamp);
        var adjustedTimestamp = new Date(
            '2015.01.01 '
            + lastTimestamp.getHours() + ':'
            + lastTimestamp.getMinutes() + ':00Z'
        );

        // Adding a red vertical marker at the last measurement
        options.xAxis.plotLines = [{
            value: adjustedTimestamp,
            color: 'red',
            width: 1
        }];

        $(DOMtarget).highcharts(options);
        $(document).trigger('chartComplete', APICall);
    });
}

function loadCurrentData() {
    $.getJSON('/api/current', function(json) {
        if(!json.success) {
            console.log(json.error);
            return;
        }

        $('#curr-inside').append('<p>Temperature: ' + json.temperature + '°C</p>');
        $('#curr-inside').append('<p>Humidity: ' + json.humidity + '%</p>');
    });
}

function getLocation() {
    if(config.useGeoLocation) {
        if("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(function(position) {
                config.latitude = position.coords.latitude;
                config.longitude = position.coords.longitude;
                $(document).trigger('geolocation');
                return;
            }, function() {
                console.log('Failed to get location. Using predefined coordinates instead.');
            });
        } else {
            console.log("No GeoLocation support :( Using predefined coordinates instead.");
        }
    }
    // If something went wrong, loadOutsideWeather() uses config.latitude and config.longitude
    $(document).trigger('geolocation');
}

function loadOutsideWeather() {
    if(!config.APIKey) {
        console.log('No Forecast.io API key, unable to get outside weather data.');
        return;
    }

    $.getJSON('https://api.forecast.io/forecast/'
        + config.APIKey + '/'
        + config.latitude + ','
        + config.longitude
        + '/?units=si&exclude=minutely,hourly,daily,alerts,flags&callback=?',
        function(json) {
            // Empty the container, because geolocation might be allowed after getting results without it
            $('#curr-outside').empty();
            $('#curr-outside').append('<p>Temperature: ' + Math.round(json.currently.temperature*10)/10 + '°C</p>');
            $('#curr-outside').append('<p>Humidity: ' + json.currently.humidity*100 + '%</p>');
            $('#curr-outside').append('<a href="http://forecast.io/#/f/'
                + config.latitude + ',' + config.longitude
                + '" target="_blank">Details on Forecast.io</a>');
        });
}

$(document).ready(function() {
    $(document).on('geolocation', function(e) {
        loadOutsideWeather();
    });

    getLocation();

    loadChart('/api/past/24h', '#chart-24h', {
        title: {
            text: 'Past 24 hours'
        }
    });

    loadChart('/api/past/week', '#chart-week', {
        title: {
            text: 'Past week'
        }
    });

    loadDoubleChart('/api/compare/today/yesterday', '#chart-yesterday', {
        title: {
            text: 'Today vs. yesterday'
        }
    });

    // Delay the current weather request until the others have completed,
    // because it takes a long time and slows down poor little Pi :(
    var charts_loaded = 0;
    $(document).on('chartComplete', function(e) {
        charts_loaded++;
        // WARNING: magic number
        if(charts_loaded >= 3) {
            loadCurrentData();
        }
    });



});
