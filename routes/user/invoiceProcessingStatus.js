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

module.exports = router;