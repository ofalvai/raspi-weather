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
        zoomType: 'x',
        // spacingLeft: 5,
        // spacingRight: 5,
        marginLeft: 50,
        marginRight: 50
    },
    xAxis: {
        type: 'datetime',
        plotBands: [ ]
    },
    yAxis: [{
        title: {
            text: 'Temperature (°C)',
            margin: 5,
            style: {
                fontWeight: 'bold'
            }
        },
        opposite: true
    },
    {
        title: {
            text: 'Humidity (%)',
            margin: 5,
            style: {
                fontWeight: 'bold'
            }
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
        align: 'left',
        verticalAlign: 'bottom',
        y: 22
    },
    tooltip: {
        shared: true,
        crosshairs: true
    },
    title: {
        text: ''
    }
};

var stats = {
    today: {
        temperature: {
            avg: 0
        },
        humidity: {
            avg: 0
        }
    },
    week: {
        temperature: {
            avg: 0
        },
        humidity: {
            avg: 0
        }
    },
    logged_days: 0
}

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
            dashStyle: 'shortdash'
        });

        $.each(json.first.data, function(index, el) {
            options.series[0].data.push(el.temperature);
            options.series[1].data.push(el.humidity);
        });
        $.each(json.second.data, function(index, el) {
            options.series[2].data.push(el.temperature);
            options.series[3].data.push(el.humidity);
        });

        options.series[1].dashStyle = 'solid';
        options.tooltip.xDateFormat = '%H:%M';
        options.xAxis.labels = {
            format: '{value: %H:%M}'
        };
        // options.series[1].visible = false;
        options.series[3].visible = false;

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

        $('#curr-temp-inside').text(json.temperature + '°');
        $('#curr-hum-inside').text(json.humidity + '%');
    });
}

function getLocation() {
    if(config.useGeoLocation) {
        if("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(function(position) {
                config.latitude = position.coords.latitude;
                config.longitude = position.coords.longitude;
                $(document).trigger('geolocation');
            }, function() {
                console.log('Failed to get location. Using predefined coordinates instead.');
                $(document).trigger('geolocation');
            });
        } else {
            console.log("No GeoLocation support :( Using predefined coordinates instead.");
            $(document).trigger('geolocation');
        }
    }
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
        + '/?units=si&exclude=minutely,daily,alerts,flags&callback=?',
        function(json) {            
            $('#curr-temp-outside').text(json.currently.temperature.toFixed(1) + '°');
            $('#curr-hum-outside').text((json.currently.humidity*100).toFixed() + '%');

            $('#forecast-summary').text(json.hourly.summary);
            $('#forecast-link').attr('href', 'http://forecast.io/#/f/'
                + config.latitude + ',' + config.longitude);
        });
}

function computeStats() {
    var day = $('#chart-today-vs').highcharts().series,
        week = $('#chart-past').highcharts().series;
    
    // Today:
    stats.today.temperature.min = day[0].dataMin;
    stats.today.temperature.max = day[0].dataMax;
    stats.today.humidity.min = day[1].dataMin;
    stats.today.humidity.max = day[1].dataMax;

    for(i = 0; i < day[0].data.length; i++) {
        stats.today.temperature.avg += day[0].data[i].y;
        stats.today.humidity.avg += day[1].data[i].y;
    }
    stats.today.temperature.avg = (stats.today.temperature.avg / day[0].data.length).toFixed(1);
    stats.today.humidity.avg = (stats.today.humidity.avg / day[1].data.length).toFixed(1);

    // Week:
    stats.week.temperature.min = week[0].dataMin;
    stats.week.temperature.max = week[0].dataMax;
    stats.week.humidity.min = week[1].dataMin;
    stats.week.humidity.max = week[1].dataMax;

    for(i = 0; i < week[0].data.length; i++) {
        stats.week.temperature.avg += week[0].data[i].y;
        stats.week.humidity.avg += week[1].data[i].y;
    }
    stats.week.temperature.avg = (stats.week.temperature.avg / week[0].data.length).toFixed(1);
    stats.week.humidity.avg = (stats.week.humidity.avg / week[1].data.length).toFixed(1);

    var up = '<span class="up-arrow" title="Compared to weekly average">&#9650</span>';
    var down = '<span class="down-arrow" title="Compared to weekly average">&#9660</span>';
    var todayTempArrow = (stats.today.temperature.avg > stats.week.temperature.avg) ? up : down;
    var todayHumArrow = (stats.today.humidity.avg > stats.week.humidity.avg) ? up : down;



    $('#stats').append('<tr><th>Temperature</th><th>Today</th><th>Week</th></tr>');
    $('#stats').append('<tr><th class="sub">avg</th><td>' + todayTempArrow + stats.today.temperature.avg + '°</td><td>' + stats.week.temperature.avg + '°</td></tr>');
    $('#stats').append('<tr><th class="sub">min</th><td>' + stats.today.temperature.min + '°</td><td>' + stats.week.temperature.min + '°</td></tr>');
    $('#stats').append('<tr><th class="sub">max</th><td>' + stats.today.temperature.max + '°</td><td>' + stats.week.temperature.max + '°</td></tr>');
    $('#stats').append('<tr><th>Humidity</th><th>Today</th><th>Week</th></tr>');
    $('#stats').append('<tr><th class="sub">avg</th><td>' + todayHumArrow + stats.today.humidity.avg + '%</td><td>' + stats.week.humidity.avg + '%</td></tr>');
    $('#stats').append('<tr><th class="sub">min</th><td>' + stats.today.humidity.min + '%</td><td>' + stats.week.humidity.min + '%</td></tr>');
    $('#stats').append('<tr><th class="sub">max</th><td>' + stats.today.humidity.max + '%</td><td>' + stats.week.humidity.max + '%</td></tr>');
}

$(document).ready(function() {

    $(document).on('geolocation', loadOutsideWeather);

    getLocation();

    loadDoubleChart('/api/compare/today/yesterday', '#chart-today-vs');

    loadChart('/api/past/week', '#chart-past');



    // Delay the current weather request until the others have completed,
    // because it takes a long time and slows down poor little Pi :(
    var charts_loaded = 0;
    $(document).on('chartComplete', function(e) {
        charts_loaded++;
        // WARNING: magic number
        if(charts_loaded >= 2) {
            loadCurrentData();
            computeStats();
        }
    });



    // Past chart: dropdown change interval
    $('#chart-interval-past').on('click', function(e) {
        e.preventDefault();
        var interval = $(e.target).parent().attr('data-interval');
        loadChart('/api/past/' + interval, '#chart-past');
        $('#dropdown-label-past').text(interval);
    });


    $('#btn-reload-inside').on('click', function() {
        $('#curr-temp-inside, #curr-hum-inside').text('-');
        loadCurrentData();
    });
    $('#btn-reload-outside').on('click', function() {
        $('#curr-temp-outside, #curr-hum-outside').text('-');
        loadOutsideWeather();
    });
});
