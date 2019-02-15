'use strict';
var express = require('express');
var router = express.Router();
var appRoot = require('app-root-path').path;
var dbConfig = require(appRoot + '/config/dbConfig');
var queryConfig = require(appRoot + '/config/queryConfig.js');
var commonDB = require(appRoot + '/public/js/common.db.js');
var commonUtil = require(appRoot + '/public/js/common.util.js');
var oracledb = require('oracledb');
var oracle = require('../util/oracle.js');
var sync = require('../util/sync.js');

/***************************************************************
 * Router
 * *************************************************************/

router.get('/favicon.ico', function (req, res) {
    res.status(204).end();
});

router.get('/', function (req, res) {                           // 문서등록 (GET)
    if (req.isAuthenticated()) res.render('user/docManagement', { currentUser: req.user });
    else res.redirect("/logout");
});

router.post('/', function (req, res) {                          // 문서등록 (POST)
    if (req.isAuthenticated()) res.render('user/invoiceManagement', { currentUser: req.user });
    else res.redirect("/logout");
});

router.post('/selectDocTopType', function (req, res) {
    sync.fiber(function () {
        let returnObj = {};
        let userId = req.session.userId;
        let param = [userId];
        
        let docToptypeList = sync.await(oracle.selectDocTopType(param, sync.defer()));

        returnObj = {'docToptypeList': docToptypeList};
        res.send(returnObj);
    });
});

router.post('/selectDocLabelDefList', function (req, res) {
    sync.fiber(function () {
        let returnObj = {};
        let docToptype = req.body.docToptype;
        let param = [docToptype];
        
        let docToptypeList = sync.await(oracle.selectDocLabelDefList(param, sync.defer()));

        returnObj = {'docToptypeList': docToptypeList};
        res.send(returnObj);
    });
});

router.post('/updateDocList', function (req, res) {
    sync.fiber(function () {
        let returnObj = {};
        let docToptype = req.body.docToptype;
        let docNameEng = req.body.docNameEng;
        let docNameKor = req.body.docNameKor;
        let insertList = req.body.insertList;
        let changeList = req.body.changeList;
        let deleteList = req.body.deleteList;
        let userId = req.session.userId;
        
        // doctoptype 추가
        if(docToptype == 0) {
            let param = [docNameEng, docNameKor, userId];           
            docToptype = sync.await(oracle.insertDocToptype(param, sync.defer()));
            console.log(docToptype);
        }

        // 추가
        if(insertList.length > 0) {
            let param = {'docToptype' : docToptype, 'insertList' : insertList};
            sync.await(oracle.isnertDocList(param, sync.defer()));
        }

        //수정
        if(docToptype != 0 && changeList.length > 0) {
            let param = {'changeList' : changeList};
            sync.await(oracle.updateDocList(param, sync.defer()));            
        }
        
        //삭제
        if(docToptype != 0 && deleteList.length > 0) {
            let param = {'deleteList' : deleteList};
            sync.await(oracle.deleteDocList(param, sync.defer()));            
        }

        returnObj = {'docToptype' : docToptype};
        res.send(returnObj);
    });
});

module.exports = router;