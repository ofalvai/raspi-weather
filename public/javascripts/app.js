var globalHighchartsOptions = {
    chart: {
        type: 'spline',
        zoomType: 'x'
    },
    xAxis: {
        type: 'datetime'
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
        opposite: true
    }],
    series: [{
            name: 'Temperature',
            yAxis: 0,
            data: [],
            lineWidth: 4,
            marker: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '°C'
            },
            color: '#f7a35c',
            dataLabels: {
                enabled: true
            }
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
            color: '#7cb5ec',
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
        text: ''
    }
}


function loadChart(APICall, DOMtarget, moreOptions) {
    $.getJSON(APICall, function(json) {
        var options = $.extend(true, {}, globalHighchartsOptions, moreOptions);


        options.series[0].pointStart = Date.parse(json[0].timestamp + 'Z');
        // Ugly timezone hacking, because Date.parse() assumes UTC, and the timestamp is in local timezone
        options.series[1].pointStart = Date.parse(json[0].timestamp + 'Z');

        options.series[0].pointInterval = 1000 * 60 * 10; //10 minutes
        options.series[1].pointInterval = 1000 * 60 * 10; //10 minutes

        $.each(json, function(index, el) {
            options.series[0].data.push(el.temp);
            options.series[1].data.push(el.hum);
        });

        $(DOMtarget).highcharts(options);
    });
}

function loadDoubleChart(APICall, DOMtarget, moreOptions) {
    $.getJSON(APICall, function(json) {
        var options = $.extend(true, {}, globalHighchartsOptions, moreOptions);

        // Adding two more series
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
            color: '#f7a35c',
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
            color: '#7cb5ec',
            dashStyle: 'dot',
            visible: false
        });

        options.series[1].visible = false;
        options.tooltip.xDateFormat = '%H:%M';
        options.xAxis.labels = {
            format: '{value: %H:%M}'
        };

        for(var i = 0; i < options.series.length; i++) {
            // Just a dummy date object set to the beginning of a dummy day
            // Only the hours and minutes will be displayed
            options.series[i].pointStart = Date.parse('2015.01.01 00:00Z');
            options.series[i].pointInterval = 1000 * 60 * 10; //10 minutes
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

        // Processing the first set of data
        $.each(json.first.data, function(index, el) {  
            options.series[0].data.push(el.temp);
            options.series[1].data.push(el.hum);
        });
        // And the second
        $.each(json.second.data, function(index, el) {  
            options.series[2].data.push(el.temp);
            options.series[3].data.push(el.hum);
        });

        $(DOMtarget).highcharts(options);
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
        },
        series:[{
            color: '#f45b5b'
        }]
    });

    loadDoubleChart('/api/compare/today/yesterday', '#chart-yesterday', {
        title: {
            text: 'Yesterday vs. Today'
        }
    });

});