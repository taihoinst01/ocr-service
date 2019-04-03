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
var fs = require('fs');
var PythonShell = require('python-shell');
var pythonConfig = require(appRoot + '/config/pythonConfig');
var localRequest = require('sync-request');

/***************************************************************
 * Router
 * *************************************************************/

router.get('/favicon.ico', function (req, res) {
    res.status(204).end();
});

router.get('/', function (req, res) {                           // 문서등록 (GET)
    if (req.isAuthenticated()) res.render('user/setting', { currentUser: req.user });
    else res.redirect("/logout");
});

router.post('/', function (req, res) {                          // 문서등록 (POST)
    if (req.isAuthenticated()) res.render('user/invoiceRegistration', { currentUser: req.user });
    else res.redirect("/logout");
});

/* TXT 파일 리스트 목록 불러오기 */
router.post('/selectTxtList', function (req, res) {
    sync.fiber(function () {
        let returnObj = {};
        var returnArr = [];

        var array = fs.readFileSync('ml/ColumnMapping/splitLabel.txt').toString().split("\n");
        for(var i in array) {
            returnArr.push(array[i]);
        }

        returnObj = {'TxtList': returnArr};
        res.send(returnObj);
    });
});

/* TXT 파일 리스트 변경 (추가) */
router.post('/updateTxt', function (req, res) {
    sync.fiber(function () {
        let returnObj = {};
        let newText = req.body.addList;
        var resultText = "";

        // 추가
        // if(newText.length > 0) {
        //     var originalText = fs.readFileSync('ml/ColumnMapping/splitLabel.txt').toString();
        //     resultText = originalText;

        //     for(var i in newText) {
        //         resultText += "\n"+ newText[i];
        //     }
        //     fs.writeFileSync('ml/ColumnMapping/splitLabel.txt', resultText, 'utf8');
        // }
        if(newText.length > 0) {
            sync.await(insertSplitData(JSON.stringify(newText),sync.defer()));
            pythonConfig.columnMappingOptions.args = [];
            pythonConfig.columnMappingOptions.args.push(JSON.stringify(newText));
            var resPyStr = sync.await(PythonShell.run('pySplitLabel.py', pythonConfig.columnMappingOptions, sync.defer()));
        }  


        returnObj = {'TxtList': resultText};
        res.send(returnObj);
    });
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

function insertSplitData(req, done) {
    return new Promise(async function (resolve, reject) {
        try {
            
            var res = localRequest('POST', 'http://52.141.34.200:5000/insertSplitData', {
                headers:{'content-type':'application/json'},
                json:{sentence:req}
            });
            var resJson = res.getBody('utf8');
            return done(null, resJson);
        } catch (err) {
            console.log(err);
            return done(null, 'error');
        } finally {

        }
    });   
};

module.exports = router;