var config = {
    /**
     * Frequency of measurement in minutes
     * Note: it's only needed for the graph intervals, doesn't set the logging interval.
     * You have to edit your crontab for that.
     */
    measurementInterval: 30,

    /**
     * fahrenheit or celsius
     * If you change this to fahrenheit, make sure you change the color zones below as well!
     */
    unit: 'celsius',

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

    /*
     * Color zones for the graph lines.
     * Adjust to your climate and season.
     * The number means the upper bound of the interval.
     * 
     * Default values and meanings:
     * Low (yellow)......: 0-21
     * Medium (orange)...: 21-25
     * High (red)........: 26-99
     */
    zones: {
        low: 21,
        med: 25,
        high: 99
    },

    /**
     * Forecast.io API key.
     * Please don't abuse this. Be a good guy and request your own at http://developer.forecast.io
     */
    APIKey: '262d0436a1b2d47e7593f0bb41491b64',

    // Limits of the night plotband (the gray area on the graphs)
    nightStart: 0,
    nightEnd: 7,

    // Used in chartComplete() to delay loading current sensor data
    numOfCharts: 2,
    loadedCharts: [ ]
};

var globalHighchartsOptions = {
    chart: {
        type: 'spline',
        zoomType: 'x',
        // To prevent the humidity axis to have ticks over 100:
        alignTicks: false, 
        marginLeft: 50,
        marginRight: 50,
        events: {
            load: chartComplete
        }
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
        opposite: true,
        tickInterval: config.unit == "celsius" ? 1 : 10
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
        max: 100,
        // To prevent the humidity axis to have unrealistic ticks: only 0, 50, 100
        tickAmount: 3
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
                value: config.zones.low,
                color: '#F1AE24'
            },
            {
                value: config.zones.med,
                color: '#F18324'
            },
            {
                value: config.zones.high,
                color: '#F2552E'
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
            color: '#869BCE',
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
    },
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
    interval: {
        temperature: {
            avg: 0
        },
        humidity: {
            avg: 0
        }
    },
    logged_days: 0
};

function loadChart(APICall, DOMtarget, moreOptions) {
    $.getJSON(APICall, function(json) {
        if(!json.success) {
            displayError(json.error, DOMtarget);
            return;
        }

        if(json.data.length === 0) {
            displayError('No data to display.', DOMtarget);
            return;
        }

        var options = $.extend(true, {}, globalHighchartsOptions, moreOptions);

        $.each(json.data, function(index, el) {
            // Populating the series
            options.series[0].data.push(format(el.temperature));
            options.series[1].data.push(el.humidity);

            // Computing plot bands for the night interval(s)
            // Firefox needs T between date and time
            // el.timestamp = el.timestamp.replace(' ', 'T');
            var timeEpoch = parseDateTime(el.timestamp + 'Z');
            // The above creates a timezone-correct UNIX epoch representation
            // of the timestamp, and we need a regular datetime object
            // to get hours and minutes.
            var time = new Date(el.timestamp);
            // Night start
            if(time.getHours() == config.nightStart && time.getMinutes() === 0) {
                options.xAxis.plotBands.push({
                    from: timeEpoch,
                    to: null, // will be stored later
                    color: '#f2f2f2'
                });
            }
            // Night end
            if(time.getHours() == config.nightEnd && time.getMinutes() === 0) {
                options.xAxis.plotBands[options.xAxis.plotBands.length-1].to = timeEpoch;
            }
        });

        // End the plotband if currently it's night
        var last = options.xAxis.plotBands.length - 1;
        if(options.xAxis.plotBands[last].to === null) {
            options.xAxis.plotBands[last].to = Date.parse(
                json.data[json.data.length-1].timestamp + 'Z'
            );
        }

        options.series[0].pointStart = Date.parse(json.data[0].timestamp + 'Z');
        // Ugly timezone hacking, because Date.parse() assumes UTC,
        // and the timestamp is in local time
        options.series[1].pointStart = Date.parse(json.data[0].timestamp + 'Z');
        options.series[0].pointInterval = config.measurementInterval * 1000 * 60;
        options.series[1].pointInterval = config.measurementInterval * 1000 * 60;

        // Custom property to compute stats from this data set
        options.doStats = true;

        options.series[0].lineWidth = 2;

        config.loadedCharts.push(APICall);
        $(DOMtarget).highcharts(options);
    });
}

function loadDoubleChart(APICall, DOMtarget, moreOptions) {
    $.getJSON(APICall, function(json) {
        if(!json.success) {
            displayError(json.error, DOMtarget);
            return;
        }

        if(json.first.data.length === 0 || json.second.data.length === 0) {
            displayError('No data to display.', DOMtarget);
            return;
        }

        // Make sure yesterday's data starts at 00:00
        var startTime = parseDateTime(json.second.data[0].timestamp);
        if(startTime.getHours() !== 0) {
            displayError('Not enough data for yesterday. A full day\'s data is required for comparison.', DOMtarget);
            $(document).trigger('chartComplete');
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
                value: config.zones.low,
                color: '#F1AE24'
            },
            {
                value: config.zones.med,
                color: '#F18324'
            },
            {
                value: config.zones.high,
                color: '#F2552E'
            }],
            dashStyle: 'shortdot'
        });

        options.series.push({
            name: 'Humidity yesterday',
            yAxis: 1,
            data: [],
            lineWidth: 2,
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '%'
            },
            color: '#7C8FBF',
            dashStyle: 'shortdot'
        });

        $.each(json.first.data, function(index, el) {
            options.series[0].data.push(format(el.temperature));
            options.series[1].data.push(el.humidity);
        });
        $.each(json.second.data, function(index, el) {
            options.series[2].data.push(format(el.temperature));
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
            options.series[i].pointStart = Date.parse('2015-01-01T00:00Z');
            options.series[i].pointInterval = config.measurementInterval * 1000 * 60;
        }

        // Converting the actual last timestamp to our dummy datetime object
        var lastTimestamp = parseDateTime(json.first.data[json.first.data.length-1].timestamp);
        var h = lastTimestamp.getHours();
        var m = lastTimestamp.getMinutes();
        // Trailing zeros
        h = (h < 10) ? '0' + h : h;
        m = (m < 10) ? '0' + m : m;

        var adjustedTimestamp = parseDateTime(
            '2015-01-01 ' + h + ':' + m + ':00Z'
        );

        // Adding a red vertical marker at the last measurement
        options.xAxis.plotLines = [{
            value: adjustedTimestamp,
            color: 'red',
            width: 1
        }];

        config.loadedCharts.push(APICall);
        $(DOMtarget).highcharts(options);
    });
}

function loadCurrentData() {
    $.getJSON('/api/current', function(json) {
        if(!json.success) {
            displayError(json.error, '#error-container');
            return;
        }

        $('#curr-temp-inside').text(format(json.temperature) + '°');
        $('#curr-hum-inside').text(json.humidity + '%');
    });
}

function parseDateTime(dateTimeString) {
    // Firefox can't parse datetime strings like YYYY-MM-DD HH:MM:SS, just YYYY-MM-DDTHH:MM:SS
    // BUT Chrome parses the 'T-format' as UTC time (the space-format is parsed as local time), and applies timezone differences,
    // which is the exact thing we don't need.
    // I can't believe I have to deal with this shit. 
    var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    if(isFirefox) {
        dateTimeString = dateTimeString.replace(' ', 'T');
    }
    return new Date(dateTimeString);
}

function chartComplete() {
    // Fired at Highchars' load event
    // 'this' points to the Highcharts object
    
    if(config.loadedCharts.length == config.numOfCharts) {
        // Delay the current weather request until the others (charts) have completed,
        // because it takes a long time and slows down poor little Pi :(
        loadCurrentData();
    }

    if(this.options.doStats) {
        // Ironically, at the time of the load event, the chart's data is not yet available....
        window.setTimeout(computeStats, 100);
    }
}

function displayError(error, target, level) {
    // Values: success (green), info (blue), warning (yellow), danger (red)
    level = level || 'danger';
    $(target).append('<div class="alert alert-' + level + '">' + error + '</div>');
}

function format(number) {
    if(config.unit == 'fahrenheit') {
        // Rounding to 1 decimal place at the same time
        return Math.round((number * (9 / 5) + 32) * 10) / 10;
    } else {
        // Celsius is THE unit, everythings is stored in it!
        return number;
    }
}

function getLocation() {
    if(config.useGeoLocation) {
        if('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(function(position) {
                config.latitude = position.coords.latitude;
                config.longitude = position.coords.longitude;
                $(document).trigger('geolocation');
            }, function() {
                if(config.useGeoLocation) {
                    // Only display if it's configured to use geolocation,
                    // not manual coordinates.
                    displayError('Failed to get location. Using predefined coordinates instead.', '#error-container', 'warning');
                }
                $(document).trigger('geolocation');
            });
        } else {
            displayError('No GeoLocation support :( Using predefined coordinates instead.', '#error-container', 'warning');
            $(document).trigger('geolocation');
        }
    }
}

function loadOutsideWeather() {
    if(!config.APIKey) {
        displayError('No Forecast.io API key, unable to get outside weather data.', '#error-container');
        return;
    }

    $.getJSON('https://api.forecast.io/forecast/' +
        config.APIKey + '/' +
        config.latitude + ',' +
        config.longitude +
        '/?units=si&exclude=minutely,daily,alerts,flags&callback=?',
        function(json) {            
            $('#curr-temp-outside').text(format(json.currently.temperature.toFixed(1)) + '°');
            $('#curr-hum-outside').text((json.currently.humidity*100).toFixed() + '%');

            $('#forecast-summary').text(json.hourly.summary);
            $('#forecast-link').attr('href', 'http://forecast.io/#/f/' +
                config.latitude + ',' + config.longitude);
        });
}

function computeStats() {
    $('#stats').empty();

    var day = $('#chart-today-vs').highcharts().series;
    var interval = $('#chart-past').highcharts().series;
    var intervalType = $('#dropdown-label-past').data('intervalType');
    
    // Today:
    stats.today.temperature.min = day[0].dataMin;
    stats.today.temperature.max = day[0].dataMax;
    stats.today.humidity.min = day[1].dataMin;
    stats.today.humidity.max = day[1].dataMax;
    stats.today.temperature.avg = 0;
    stats.today.humidity.avg = 0;

    for(i = 0; i < day[0].data.length; i++) {
        stats.today.temperature.avg += parseInt(day[0].data[i].y);
        stats.today.humidity.avg += parseInt(day[1].data[i].y);
    }
    stats.today.temperature.avg = (stats.today.temperature.avg / day[0].data.length).toFixed(1);
    stats.today.humidity.avg = (stats.today.humidity.avg / day[1].data.length).toFixed(1);

    // Last [selected] interval:
    stats.interval.temperature.min = interval[0].dataMin;
    stats.interval.temperature.max = interval[0].dataMax;
    stats.interval.humidity.min = interval[1].dataMin;
    stats.interval.humidity.max = interval[1].dataMax;
    stats.interval.temperature.avg = 0;
    stats.interval.humidity.avg = 0;

    for(i = 0; i < interval[0].data.length; i++) {
        stats.interval.temperature.avg += parseInt(interval[0].data[i].y);
        stats.interval.humidity.avg += parseInt(interval[1].data[i].y);
    }
    stats.interval.temperature.avg = (stats.interval.temperature.avg / interval[0].data.length).toFixed(1);
    stats.interval.humidity.avg = (stats.interval.humidity.avg / interval[1].data.length).toFixed(1);

    var up = '<span class="up-arrow" title="Compared to the selected interval\'s average">&#9650</span>';
    var down = '<span class="down-arrow" title="Compared to the selected interval\'s average">&#9660</span>';
    var todayTempArrow = (stats.today.temperature.avg > stats.interval.temperature.avg) ? up : down;
    var todayHumArrow = (stats.today.humidity.avg > stats.interval.humidity.avg) ? up : down;



    $('#stats').append('<tr><th>Temperature</th><th>today</th><th>' + intervalType + '</th></tr>');
    $('#stats').append('<tr><th class="sub">avg</th><td>' + todayTempArrow + stats.today.temperature.avg + '°</td><td>' + stats.interval.temperature.avg + '°</td></tr>');
    $('#stats').append('<tr><th class="sub">min</th><td>' + stats.today.temperature.min + '°</td><td>' + stats.interval.temperature.min + '°</td></tr>');
    $('#stats').append('<tr><th class="sub">max</th><td>' + stats.today.temperature.max + '°</td><td>' + stats.interval.temperature.max + '°</td></tr>');
    $('#stats').append('<tr><th>Humidity</th><th>today</th><th>' + intervalType + '</th></tr>');
    $('#stats').append('<tr><th class="sub">avg</th><td>' + todayHumArrow + stats.today.humidity.avg + '%</td><td>' + stats.interval.humidity.avg + '%</td></tr>');
    $('#stats').append('<tr><th class="sub">min</th><td>' + stats.today.humidity.min + '%</td><td>' + stats.interval.humidity.min + '%</td></tr>');
    $('#stats').append('<tr><th class="sub">max</th><td>' + stats.today.humidity.max + '%</td><td>' + stats.interval.humidity.max + '%</td></tr>');
}

function autoReload() {
    var time = new Date();
    console.log(time);
    var adjustedMinutes;
    if(config.measurementInterval > 60) {
        adjustedMinutes = config.measurementInterval % 60;
        // I know, I know, it's not 100% correct, reloads might fire more often than needed,
        // but I try to keep this code simple, and it's not a serious performance issue 
    } else {
        adjustedMinutes = config.measurementInterval;
    }

    if(time.getMinutes() % adjustedMinutes === 0) {
        console.log('It\'s time!!!', time);
        $('#btn-reload-all').trigger('click');
    }
}

$(document).ready(function() {
    // Init
    
    $(document).on('geolocation', loadOutsideWeather);

    getLocation();

    loadDoubleChart('/api/compare/today/yesterday', '#chart-today-vs');

    loadChart('/api/past/week', '#chart-past');
    // loadCurrentData() is fired by chartComplete()

    $('[data-toggle="tooltip"]').tooltip();

    $('#dropdown-label-past').data('intervalType', 'week');

    $(document).ajaxError(function() {
        // Display only one instance of a network error, although multiple failing AJAX calls trigger this event
        if ($('.alert').hasClass('network') === false) {
            // Setting a custom class
            displayError('Network error. Check your connection and server.', '#error-container', 'danger network');
        }
    });

    // The reload function is called every minute, but the function handles inside to only reload stuff when
    // there's new data collected (see config.measurementInterval)
    window.setInterval(autoReload, 60 * 1000);

    // Init end
    


    // UI events
    // Past chart: dropdown change interval
    $('#chart-interval-past').on('click', function(e) {
        e.preventDefault();

        var interval = $(e.target).parent().attr('data-interval');
        $('#dropdown-label-past').text(interval).data('intervalType', interval); // Data used in computeStats()
        loadChart('/api/past/' + interval, '#chart-past');

    });


    $('#btn-reload-inside').on('click', function() {
        $('#curr-temp-inside, #curr-hum-inside').text('...');
        loadCurrentData();
    });

    $('#btn-reload-outside').on('click', function() {
        $('#curr-temp-outside, #curr-hum-outside').text('...');
        loadOutsideWeather();
    });

    $('#btn-reload-all').on('click', function() {
        $('#error-container').empty();
        $('#curr-temp-outside, #curr-hum-outside, #curr-temp-inside, #curr-hum-inside, #forecast-summary').text('...');
        $('#chart-today-vs, #chart-past').each(function(i, el) {
            if ($(el).highcharts()) {
                // It might be uninitialized due to a previous error (eg. network error)
                $(el).highcharts().destroy();
            }
        });
        config.loadedCharts = [ ];

        loadOutsideWeather();
        loadDoubleChart('/api/compare/today/yesterday', '#chart-today-vs');
        loadChart('/api/past/week', '#chart-past');
        // loadCurrentData() is fired by chartComplete()
    });
});
