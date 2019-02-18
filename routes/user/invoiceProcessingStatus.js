'use strict';
var express = require('express');
var fs = require('fs');
var multer = require("multer");
var exceljs = require('exceljs');
var appRoot = require('app-root-path').path;
var router = express.Router();
var queryConfig = require(appRoot + '/config/queryConfig.js');
var commonDB = require(appRoot + '/public/js/common.db.js');
var commonUtil = require(appRoot + '/public/js/common.util.js');
var oracle = require('../util/oracle.js');
var sync = require('../util/sync.js');

router.get('/favicon.ico', function (req, res) {
    res.status(204).end();
});

// invoiceProcessingStatus.html 보여주기
router.get('/', function (req, res) {
    console.log("check");
    if (req.isAuthenticated()) res.render('user/invoiceProcessingStatus', { currentUser: req.user });
    else res.redirect("/logout");
});

// invoiceProcessingStatus.html 보여주기
router.post('/', function (req, res) {
    console.log("check2");
    if (req.isAuthenticated()) res.render('user/invoiceProcessingStatus', { currentUser: req.user });
    else res.redirect("/logout");
});

// 일반처리건수 조회
router.post('/processCountSel', function (req, res) {
    if (req.isAuthenticated()) fnProcessCountSel(req, res);
});

// 문저별현황 조회
router.post('/docCountSel', function (req, res) {
    if (req.isAuthenticated()) fnDocCountSel(req, res);
});

//신규문서 등록현황  
router.post('/newDocTopTypeSel', function (req, res) {
    if (req.isAuthenticated()) fnDocTopTypeSel(req, res);
});

var fnProcessCountSel = function (req, res) {
    sync.fiber(function () {
        try {


            var imgIdList = [];
            var filenameList = [];
            var processCountArr = sync.await(oracle.selectProcessCountList(req, sync.defer()));
            var processCount = sync.await(oracle.selectProcessCount(req, sync.defer()));
            
            var waitCnt = 0; // T 대기중인 건수
            var completeCnt = 0; // D 완료된 건수

            if (processCountArr.length != 0) {
                
                if (processCount.length != 0) {

                    for(var i = 0; i < processCount.length; i++) {
                        if (processCount[i].STATUS == 'T') {
                            waitCnt = processCount[i].STATUSCNT; // T 대기중인 건수
                            
                        } else if (processCount[i].STATUS == 'D') {
                            completeCnt = processCount[i].STATUSCNT; // D 완료된 건수
                        }
                    }
                }

                res.send({ 'data': processCountArr, 'code': 200, 'waitCnt': waitCnt, 'completeCnt': completeCnt});
            } else {
                res.send({ 'data': processCountArr, 'code': 200});
            }

        } catch (e) {
            console.log(e);
            res.send({ code: 400 });
        }
    });
};

var fnDocTopTypeSel = function (req, res) {
    sync.fiber(function () {
        try {
            var docTopTypeArr = sync.await(oracle.selectDocTopTypeList(req, sync.defer()));
        
            if (docTopTypeArr.length != 0) {

                res.send({ 'data': docTopTypeArr, 'code': 200});
            } else {
                res.send({ 'data': {}, 'code': 200});
            }

        } catch (e) {
            console.log(e);
            res.send({ code: 400 });
        }
    });
};

var fnDocCountSel = function (req, res) {
    sync.fiber(function () {
        try {
            var processDocCountArr = sync.await(oracle.selectProcessDocCountList(req, sync.defer()));
        
            if (processDocCountArr.length != 0) {
                var monthArr = [];
                var monthlyCntArr = [];

                for(var i = 0; i < processDocCountArr.length; i++) {
                    monthArr.push(changeMonthFnc(processDocCountArr[i].MONTH_VALUE));
                    monthlyCntArr.push(processDocCountArr[i].COUNT_VALUE);
                }

                var returnObj = {monthArr:monthArr, monthlyCntArr:monthlyCntArr}
                res.send({ 'data': returnObj, 'code': 200});
            } else {
                res.send({ 'data': {}, 'code': 200});
            }

        } catch (e) {
            console.log(e);
            res.send({ code: 400 });
        }
    });
};

var changeMonthFnc = function (monthVal) {
    var monthObj = {'01':'January', '02':'February', '03':'March', '04':'April', 
                    '05':'May', '06':'June', '07':'July', '08':'August', 
                    '09':'September', '10':'October', '11':'November', '12':'December'}
    return (typeof monthObj[monthVal]!='undefined'?monthObj[monthVal]:'None');
}

// TBL_BATCH_COLUMN_MAPPING_TRAIN 롤백
router.post('/rollbackTraining', function (req, res) {
    var modifyYYMMDD = req.body.modifyYYMMDD;
    var returnObj;
    var param;
    sync.fiber(function () {
        try {
            param = {'modifyYYMMDD': modifyYYMMDD};
            sync.await(oracle.rollbackTraining(param, sync.defer()));

            returnObj = { 'code': 200};
        } catch (e) {
            console.log(e);
            returnObj = { 'code': 500, 'message': e };

        } finally {
            res.send(returnObj);
        }

    });
});

// 문서별현황(도넛차트) 조회
router.post('/selectDocStatus', function (req, res) {
    var returnObj;
    var param;
    sync.fiber(function () {
        try {

            var docStatusList = sync.await(oracle.selectDocStatus(null, sync.defer()));

            returnObj = { 'code': 200, 'docStatusList': docStatusList};
        } catch (e) {
            console.log(e);
            returnObj = { 'code': 500, 'message': e };

        } finally {
            res.send(returnObj);
        }

    });
});

module.exports = router;