$(document).ready(function() {
    var options = {
        chart: {
            type: 'spline',
            zoomType: 'x'
        },
        title: {
            text: 'Last 24 hours'
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
                pointInterval: 1000 * 60 * 10, //10 minutes
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
                pointInterval: 1000 * 60 * 10, //10 minutes
                marker: {
                    enabled: false
                },
                tooltip: {
                    valueSuffix: '%'
                },
                color: '#7cb5ec',
                dashStyle: 'ShortDot'
            }
        ],
        legend: {
            align: 'left',
            verticalAlign: 'top'
        },
        tooltip: {
            shared: true,
            crosshairs: true
        }
    };
    $.getJSON('/api/past/24h', function(json) {
        options.series[0].pointStart = Date.parse(json[0].timestamp + 'Z');
        // Ugly timezone hacking, because Date.parse() assumes UTC, and the timestamp is in local timezone
        options.series[1].pointStart = Date.parse(json[0].timestamp + 'Z');

        $.each(json, function(index, el) {
            options.series[0].data.push(el.temp);
            options.series[1].data.push(el.hum);
        });

        $('#chart').highcharts(options);
    });


});