//import { identifier } from "babel-types";
"use strict";

$(function () {
    _init();
});

var _init = function () {
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
        'October', 'November', 'December'];

	var lineConfig = {
        type: 'line',
		data: {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
			datasets: [{
                label: '',
                backgroundColor: 'rgba(255,255,255,1)',
                borderColor: 'rgba(234,113,105,1)',
                data: [5,4,7,8,3,3,0],
                fill: false,
            }]
        },
		options: {
        legend: {
            display: false
        },
		tooltips: {
            enabled: true,
            mode: 'index',
            position: 'nearest',
				callbacks: {
                    label: function(tooltipItem) {
                        return tooltipItem.yLabel;
                    }
                }
            },
			scales: {
                yAxes: [{
                    ticks: {
                        stepSize: 1,
                        suggestedMin: 0,
                        suggestedMax: 10,
                    }
                }]
            }
        }
    };

    var pieConfig = {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [65, 12, 23],
                backgroundColor: [
                    'rgba(220,100,90,1)',
                    'rgba(240,130,120,1)',
                    'rgba(234,113,105,1)',
                ],
                label: ''
            }],
            labels: [
                'ICR2018',
                'ICR2018',
                'ICR2018'
            ]
        },
        options: {
            responsive: true
        }
    };

    var color = Chart.helpers.color;
    var barChartData = {
        labels: ['January', 'February', 'March', 'April', 'May'],
        datasets: [{
            label: '',
            backgroundColor: color(window.chartColors.red).alpha(0.5).rgbString(),
            borderColor: 'rgba(234,113,105,1)',
            borderWidth: 1,
            data: [
                6,
                7,
                5,
                4,
                7
            ]
        }]

    };

    var barConfig = {
        type: 'bar',
        data: barChartData,
        options: {
            responsive: true,
            legend: {
                position: '0',
            },
            scales: {
                yAxes: [{
                    display: true,
                    ticks: {
                        beginAtZero: true,
                        steps: 1,
                        stepValue: 1,
                        min: 0
                    }
                }]
            }
        }
    };

	window.onload = function() {
        var lineCtx = document.getElementById('line').getContext('2d');
        var pieCtx = document.getElementById('pie').getContext('2d');
        var barCtx = document.getElementById('bar').getContext('2d');

        window.myLine = new Chart(lineCtx, lineConfig);
        window.myPie = new Chart(pieCtx, pieConfig);
        window.myBar = new Chart(barCtx, barConfig);
    };

};