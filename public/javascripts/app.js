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
        }
    },
    {
        title: {
            text: 'Humidity (%)'
        },
        opposite: true,
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
}

var globalGaugeOptions = {
    chart: {
        type: 'gauge'
    },
    title: {
        text: ''
    },
    pane: {
        startAngle: -150,
        endAngle: 150
    },
    yAxis: {
        min: -10,
        max: 40,
        title: {
            text: "°C"
        },
        plotBands: [{
            from: -10,
            to: 0,
            color: '#55BF3B' // green
        }, {
            from: 0,
            to: 25,
            color: '#DDDF0D' // yellow
        }, {
            from: 25,
            to: 40,
            color: '#DF5353' // red
        }]
    },
    series: [{
        name: 'Temperature',
        data: [],
        tooltip: {
            valueSuffix: ' °C'
        }
    }]
}

function loadChart(APICall, DOMtarget, moreOptions) {
    $.getJSON(APICall, function(json) {
        var options = $.extend(true, {}, globalHighchartsOptions, moreOptions);

        $.each(json, function(index, el) {
            // Populating the series
            options.series[0].data.push(el.temperature);
            options.series[1].data.push(el.humidity);

            // Computing plot bands for the night interval(s)
            var timeEpoch = Date.parse(el.timestamp + 'Z');
            // The above creates a timezone-correct UNIX epoch representation of the timestamp,
            // and we need a regular datetime object to get hours and minutes.
            // Ugly timezone hacking...
            var time = new Date(el.timestamp);
            // Night start
            if(time.getHours() == 0 && time.getMinutes() == 0) {
                options.xAxis.plotBands.push({
                    from: timeEpoch,
                    to: null, // will be stored later
                    color: '#fafafa'
                });
            }
            // Night end
            if(time.getHours() == 7 && time.getMinutes() == 0) {
                options.xAxis.plotBands[options.xAxis.plotBands.length-1].to = timeEpoch;
            }
        });

        // End the plotband if it's during the night
        if(options.xAxis.plotBands[options.xAxis.plotBands.length-1].to == null) {
            options.xAxis.plotBands[options.xAxis.plotBands.length-1].to = Date.parse(json[json.length-1].timestamp + 'Z');
        }

        options.series[0].pointStart = Date.parse(json[0].timestamp + 'Z');
        // Ugly timezone hacking, because Date.parse() assumes UTC, and the timestamp is in local timezone
        options.series[1].pointStart = Date.parse(json[0].timestamp + 'Z');
        options.series[0].pointInterval = 1000 * 60 * 30; //30 minutes
        options.series[1].pointInterval = 1000 * 60 * 30; //30 minutes

        $(DOMtarget).highcharts(options);
        $(document).trigger('chartComplete', APICall);
    });
}

function loadDoubleChart(APICall, DOMtarget, moreOptions) {
    $.getJSON(APICall, function(json) {
        // Make sure yesterday's data starts at 00:00
        var startTime = new Date(json.second.data[0].timestamp);
        if(startTime.getHours() !== 0) {
            console.log('Not enough data for yesterday. A full day\'s data is required for comparison');
            $(document).trigger('chartComplete', APICall);
            return;
        }

        var options = $.extend(true, {}, globalHighchartsOptions, moreOptions);

        // Adding  more series
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
            options.series[i].pointInterval = 1000 * 60 * 30; //30 minutes
        }

        // Converting the actual last timestamp to our dummy datetime object
        var lastTimestamp = new Date(json.first.data[json.first.data.length-1].timestamp);
        var adjustedTimestamp = new Date('2015.01.01 ' + lastTimestamp.getHours() + ':' + lastTimestamp.getMinutes() + ':00Z');

        // Adding a red vertical marker at the last measurement
        options.xAxis.plotLines = [{
            value: adjustedTimestamp,
            color: 'red',
            width: 1
        }];

        // Night plotband
        options.xAxis.plotBands = [{
            from: Date.parse('2015.01.01 00:00Z'),
            to: Date.parse('2015.01.01 07:00Z'),
            color: '#fafafa'
        }];

        $(DOMtarget).highcharts(options);
        $(document).trigger('chartComplete', APICall);
    });
}

function loadCurrentData() {
    $.getJSON('/api/current', function(json) {
        // globalGaugeOptions.series[0].data[0] = json.temperature;
        // $('#curr-temp').highcharts(globalGaugeOptions);
        $('#curr-temp').append('<p>Temperature: ' + json.temperature + '°C</p>');
        $('#curr-temp').append('<p>Humidity: ' + json.humidity + '%</p>');

        
    });
}

$(document).ready(function() {

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
        if(charts_loaded >= 3) {
            // WARNING: magic number
            loadCurrentData();
        }
    });


});