//import { identifier } from "babel-types";
"use strict";
var monthEngNames = ['January', 'Febuary', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'];
var dayEngNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday','Saturday'];
var progressId; // progress Id

// var addCond = "LEARN_N"; // LEARN_N:학습미완료, LEARN_Y:학습완료, default:학습미완료


$(function () {
    _init();
    processCountSel();
    newDocTopTypListFnc();
    docCountSel();
    dateEvent();


    //$('#wrapper').css({ 'height': ($(document).height()) + 'px' });
    //console.log($('.first_content').height());
    //var initContentHeight1 = $('.first_content').height();
    //$('.first_content').css({ 'height': initContentHeight1 + 'px' });
    //$('.content1').css({ 'height': initContentHeight1 + 'px' });
    //$('.content2').css({ 'height': initContentHeight1 + 'px' });
    //$('.content3').css({ 'height': initContentHeight1 + 'px' });

    $(window).resize(function () {
        console.log('aaaaaaa');
        //$('#wrapper').css({ 'height': ($(document).height()) + 'px' });
        //$('.wc-carousel').css({ 'width': ($(document).width() - 74) + 'px' });
        //$('.tooltip').tooltip('show');
    });
});

var _init = function () {
    var colorList = ['#FFB6C1', '#FFCFDA', '#FFAAAF', '#FFDCE1', '#FF9E9B', '#FFD0CD', '#FF7A85', '#FFACB7', '#FF5675', '#FF88A7'];
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

    /*
    var color = Chart.helpers.color;
    //두연
    var barChartData = {
        labels: ['January', 'February', 'March', 'April', 'May'],
        datasets: [{
            label: '',
            backgroundColor: color(window.chartColors.red).alpha(0.3).rgbString(),
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
    */

    //문서별현황(도넛차트) 조회
    $.ajax({
        url: '/invoiceProcessingStatus/selectDocStatus',
        type: 'post',
        datatype: 'json',
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function(){
            $('#progressMsgTitle').html('문서별현황 조회중..');
            pieConfig.data.labels = [];
            pieConfig.data.datasets[0].data = [];
            pieConfig.data.datasets[0].backgroundColor = [];
            progressId = showProgressBar();
        },
        success: function (data) {
            //console.log(data);
            if (data.code == 200) {
                var docStatusList = data.docStatusList;

                if(docStatusList.length != 0) {
                    for(var i = 0; i < docStatusList.length; i++) {
                        pieConfig.data.labels.push(docStatusList[i].ENGNM);
                        pieConfig.data.datasets[0].data.push(docStatusList[i].COUNT);
                        pieConfig.data.datasets[0].backgroundColor.push(i < 10 ? colorList[i] : colorList[i - 10]);
                    }
                } else {
                    pieConfig.data.labels.push('문서없음');
                    pieConfig.data.datasets[0].data.push(100);
                    pieConfig.data.datasets[0].backgroundColor.push('#edebeb');
                }
                var pieCtx = document.getElementById('pie').getContext('2d');
                new Chart(pieCtx, pieConfig);
            } else {
                
            }
            endProgressBar(progressId);
        },
        error: function (err) {
            console.log(err);
        }
    });

	window.onload = function() {
        // var lineCtx = document.getElementById('line').getContext('2d');
        //var pieCtx = document.getElementById('pie').getContext('2d');
        var barCtx = document.getElementById('bar').getContext('2d');

        // window.myLine = new Chart(lineCtx, lineConfig);
        //window.myPie = new Chart(pieCtx, pieConfig);
        window.myBar = new Chart(barCtx, barConfig);
        //var pieCtx = document.getElementById('pie').getContext('2d');
        //var barCtx = document.getElementById('bar').getContext('2d');

        // window.myLine = new Chart(lineCtx, lineConfig);
        //window.myPie = new Chart(pieCtx, pieConfig);
        //window.myBar = new Chart(barCtx, barConfig);
    };

};

var dateEvent = function () {    

    $('#year_up_btn').click(function (e) {
        var currentYear = $(e.target).next().find('.main_div').eq(0).children(0).text();

        $(e.target).next().find('.bottom_line').text(Number(currentYear) - 2);
        $(e.target).next().find('.main_div').find(':first-child').text(Number(currentYear) - 1);
        $(e.target).next().find('.top_line').text(currentYear);
    });
    $('#year_down_btn').click(function (e) {
        var currentYear = $(e.target).prev().find('.main_div').eq(0).children(0).text();

        $(e.target).prev().find('.bottom_line').text(currentYear);
        $(e.target).prev().find('.main_div').find(':first-child').text(Number(currentYear) + 1);
        $(e.target).prev().find('.top_line').text(Number(currentYear) + 2);
    });

    $('#month_up_btn').click(function (e) {
        var currentMonth = $(e.target).next().find('.main_div').eq(0).children().eq(0).text();

        if ((Number(currentMonth) - 1) > 0 && (Number(currentMonth) - 1) < 13) {
            var year = $('.ips_date_year .main_div > p').text();
            var day = $('.ips_date_day .main_div > p:eq(0)').text();
            var today = new Date(year + '-' + (Number(currentMonth) - 1) + '-' + day).getDay();

            if ((Number(currentMonth) - 1) != 1) {
                $(e.target).next().find('.bottom_line').text(Number(currentMonth) - 2);
            } else {
                $(e.target).next().find('.bottom_line').text('');
            }
            $(e.target).next().find('.main_div').find(':first-child').text(Number(currentMonth) - 1);
            $(e.target).next().find('.main_div').children().eq(1).text(monthEngNames[Number(currentMonth) - 2]);
            $('.ips_date_day .main_div > p:eq(1)').text(dayEngNames[today]);
            if ((Number(currentMonth) - 1) != 12) {
                $(e.target).next().find('.top_line').text(currentMonth);
            } else {
                $(e.target).next().find('.top_line').text('');
            }            
        }
    });
    $('#month_down_btn').click(function (e) {    
        var currentMonth = $(e.target).prev().find('.main_div').eq(0).children().eq(0).text();

        if ((Number(currentMonth) + 1) > 0 && (Number(currentMonth) + 1) < 13) {
            var year = $('.ips_date_year .main_div > p').text();
            var day = $('.ips_date_day .main_div > p:eq(0)').text();
            var today = new Date(year + '-' + (Number(currentMonth) + 1) + '-' + day).getDay();

            if ((Number(currentMonth) + 1) != 1) {
                $(e.target).prev().find('.bottom_line').text(currentMonth);
            } else {
                $(e.target).prev().find('.bottom_line').text('');
            }
            $(e.target).prev().find('.main_div').find(':first-child').text(Number(currentMonth) + 1);
            $(e.target).prev().find('.main_div').children().eq(1).text(monthEngNames[Number(currentMonth)]);
            $('.ips_date_day .main_div > p:eq(1)').text(dayEngNames[today]);
            if ((Number(currentMonth) + 1) != 12) {
                $(e.target).prev().find('.top_line').text(Number(currentMonth) + 2);
            } else {
                $(e.target).prev().find('.top_line').text('');
            }
        }
    });

    $('#day_up_btn').click(function (e) {
        var currentday = $(e.target).next().find('.main_div').eq(0).children().eq(0).text();

        if ((Number(currentday) - 1) > 0 && (Number(currentday) - 1) < 32) {
            var year = $('.ips_date_year .main_div > p').text();
            var month = $('.ips_date_month .main_div > p:eq(0)').text();
            var today = new Date(year + '-' + month + '-' + (Number(currentday) - 1)).getDay();

            if ((Number(currentday) - 1) != 1) {
                $(e.target).next().find('.bottom_line').text(Number(currentday) - 2);
            } else {
                $(e.target).next().find('.bottom_line').text('');
            }
            $(e.target).next().find('.main_div').find(':first-child').text(Number(currentday) - 1);
            $(e.target).next().find('.main_div').children().eq(1).text(dayEngNames[today]);
            if ((Number(currentday) - 1) != 31) {
                $(e.target).next().find('.top_line').text(currentday);
            } else {
                $(e.target).next().find('.top_line').text('');
            }
        }
    });
    $('#day_down_btn').click(function (e) {
        var currentday = $(e.target).prev().find('.main_div').eq(0).children().eq(0).text();

        if ((Number(currentday) + 1) > 0 && (Number(currentday) + 1) < 32) {
            var year = $('.ips_date_year .main_div > p').text();
            var month = $('.ips_date_month .main_div > p:eq(0)').text();
            var today = new Date(year + '-' + month + '-' + (Number(currentday) + 1)).getDay();

            if ((Number(currentday) + 1) != 1) {
                $(e.target).prev().find('.bottom_line').text(currentday);
            } else {
                $(e.target).prev().find('.bottom_line').text('');
            }
            $(e.target).prev().find('.main_div').find(':first-child').text(Number(currentday) + 1);
            $(e.target).prev().find('.main_div').children().eq(1).text(dayEngNames[today]);
            if ((Number(currentday) + 1) != 31) {
                $(e.target).prev().find('.top_line').text(Number(currentday) + 2);
            } else {
                $(e.target).prev().find('.top_line').text('');
            }
        }
    });

    $('#roll_back_btn').click(function (e) {

        var year = $('#rollbackYear').html();
        var month = $('#rollbackMonth').html();
        var date = $('#rollbackDate').html();
        var modifyYYMMDD = year + '/' + month + '/' + date;
        
        var param = {
            "modifyYYMMDD": modifyYYMMDD
        };

        $.ajax({
            url: '/invoiceProcessingStatus/rollbackTraining',
            type: 'post',
            datatype: 'json',
            data: JSON.stringify(param),
            contentType: 'application/json; charset=UTF-8',
            beforeSend: function(){
                $('#progressMsgTitle').html('roll back 중..');
                progressId = showProgressBar();
            },
            success: function (data) {
                if (data.code == 200) {
                    fn_alert('alert', '설정하신 시점으로 roll back 완료 되었습니다.');
                } else {
                    fn_alert('alert', data.message);
                }
                endProgressBar(progressId);
            },
            error: function (err) {
                console.log(err);
            }
        });
        
        /*
        var d = new Date();
        $('.ips_date_year .bottom_line:eq(0)').text(d.getFullYear() - 1);
        $('.ips_date_year .main_div > p').text(d.getFullYear());
        $('.ips_date_year .top_line:eq(0)').text(d.getFullYear() + 1);

        if (d.getMonth() != 0) {
            $('.ips_date_month .bottom_line:eq(0)').text(d.getMonth());
        } else {
            $('.ips_date_month .bottom_line:eq(0)').text('');
        }
        $('.ips_date_month .main_div > p:eq(0)').text(d.getMonth() + 1);
        $('.ips_date_month .main_div > p:eq(1)').text(monthEngNames[d.getMonth()]);
        if (d.getMonth() != 11) {
            $('.ips_date_month .top_line:eq(0)').text(d.getMonth() + 2);
        } else {
            $('.ips_date_month .top_line:eq(0)').text('');
        }

        if (d.getDate() != 1) {
            $('.ips_date_day .bottom_line:eq(0)').text(d.getDate() - 1);
        } else {
            $('.ips_date_day .bottom_line:eq(0)').text('');
        }
        $('.ips_date_day .main_div > p:eq(0)').text(d.getDate());
        $('.ips_date_day .main_div > p:eq(1)').text(dayEngNames[d.getDay()]);

        if (d.getDate() != 31) {
            $('.ips_date_day .top_line:eq(0)').text(d.getDate() + 1);
        } else {
            $('.ips_date_day .top_line:eq(0)').text('');
        }
        */
    });
    
};

var newDocTopTypListFnc = function() {
    // 필요없음
    var param = {
    };

    $.ajax({
        url: '/invoiceProcessingStatus/newDocTopTypeSel',
        type: 'post',
        datatype: "json",
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            $('#userProcessingStatus .ips_user_tbody').html('');
        },
        success: function (data) {
            if (data.code != 200) {
                return false;
            }
            var resultArr = data.data;
            var inputHtml = '';
            for (var i=0; i<resultArr.length; i++) {
                inputHtml += '<tr>';
                inputHtml += '<td name="td_base">' + resultArr[i].ENGNM + '</td>';
                inputHtml += '<td name="td_base">' + resultArr[i].KORNM + '</td>';
                inputHtml += '<td name="td_base">' + resultArr[i].SEQNUM + '</td>';
                inputHtml += '<td name="td_base" class="red">' + resultArr[i].USERID + '</td>';
                inputHtml += '</tr>';
            }
            $('#userProcessingStatus .ips_user_tbody').html(inputHtml);
        },
        error: function (err) {
            console.log(err);
        }
    });
};


var processCountSel = function() {
    // 필요없음
    var param = {
    };

    $.ajax({
        url: '/invoiceProcessingStatus/processCountSel',
        type: 'post',
        datatype: "json",
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
        },
        success: function (data) {
            var list = data.data;
            var waitCnt = data.waitCnt;
            var completeCnt = data.completeCnt;
            var maxNum = 0;
            
            $('#waitCnt').html(waitCnt);
            $('#completeCnt').html(completeCnt);
            
            var lastMon = list[list.length - 1].PROCESSDATE.substring(list[list.length - 1].PROCESSDATE.length-2,list[list.length - 1].PROCESSDATE.length);

            for(var i=0; i < list.length; i++) {
                if(list[i].DATECNT > maxNum){
                    maxNum = list[i].DATECNT
                }
            }

            // 12 - 6 + 2 = 8,9,10,11,12,1,2
            // 12 - 6 + 3 = 9,10,11,12,1,2,3
            var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            var CHARTMONTHS = [];
            var CHARTMONTHSVAL = [];
            var sw = false;

            var startMon = 12 - 6 + parseInt(lastMon);

            for (var i=0; i<7; i++) {
                if(startMon < 13) {
                    CHARTMONTHS.push(MONTHS[parseInt(startMon)-1]);
                    
                    for(var j=0; j < list.length; j++) {
                        var tempMon = parseInt(list[j].PROCESSDATE.substring(list[j].PROCESSDATE.length-2,list[j].PROCESSDATE.length));
                        if(startMon == tempMon) {
                            CHARTMONTHSVAL.push(list[j].DATECNT);
                            sw = true;
                            break;
                        }

                        if(j == list.length-1 && sw == false) {
                            CHARTMONTHSVAL.push(0);
                        }
                    }
                    sw = false;
                    startMon++;
                } else {
                    startMon = 1;
                    i--;
                }
            }

            var lineCtx = document.getElementById('line').getContext('2d');
            var lineConfig = {
                type: 'line',
                data: {
                    labels: [CHARTMONTHS[0], CHARTMONTHS[1], CHARTMONTHS[2], CHARTMONTHS[3], CHARTMONTHS[4], CHARTMONTHS[5], CHARTMONTHS[6]],
                    datasets: [{
                        label: '',
                        backgroundColor: 'rgba(255,255,255,1)',
                        borderColor: 'rgba(234,113,105,1)',
                        data: [CHARTMONTHSVAL[0],CHARTMONTHSVAL[1],CHARTMONTHSVAL[2],CHARTMONTHSVAL[3],CHARTMONTHSVAL[4],CHARTMONTHSVAL[5],CHARTMONTHSVAL[6]],
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
                                stepSize: Math.round(maxNum / 5),
                                suggestedMin: 0,
                                suggestedMax: maxNum,
                            }
                        }]
                    }
                }
            };
            window.myLine = new Chart(lineCtx, lineConfig);
        },
        error: function (err) {
            console.log(err);
        }
    });
};



var docCountSel = function() {
    // 필요없음
    var param = {
    };

    $.ajax({
        url: '/invoiceProcessingStatus/docCountSel',
        type: 'post',
        datatype: "json",
        data: JSON.stringify(param),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
        },
        success: function (data) {
            if (data.code != 200) {
                return false;
            }
            makeDocCountBarFnc(data.data);
        },
        error: function (err) {
            console.log(err);
        }
    });
};

var makeDocCountBarFnc = function(resultObj) {
    
    var monthArr = resultObj.monthArr;
    var monthlyCntArr = resultObj.monthlyCntArr;

    var color = Chart.helpers.color;

    var barChartData = {
        labels: monthArr,//['January', 'February', 'March', 'April', 'May'],
        datasets: [{
            label: '',
            backgroundColor: color(window.chartColors.red).alpha(0.3).rgbString(),
            borderColor: 'rgba(234,113,105,1)',
            borderWidth: 1,
            data: monthlyCntArr
            /*[
                6,
                7,
                5,
                4,
                7
            ]*/
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
    
    var barCtx = document.getElementById('bar').getContext('2d');
    window.myBar = new Chart(barCtx, barConfig);
}