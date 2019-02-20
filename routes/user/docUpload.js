'use strict';
var express = require('express');
var fs = require('fs');
var multer = require("multer");
var exceljs = require('exceljs');
var appRoot = require('app-root-path').path;
var router = express.Router();

var ocrUtil = require('../util/ocr.js');
var oracledb = require('oracledb');
var dbConfig = require('../../config/dbConfig.js');
var exec = require('child_process').exec;
var execSync = require('sync-exec');
var logger = require('../util/logger');
var aimain = require('../util/aiMain');
var commonDB = require(appRoot + '/public/js/common.db.js');
var commonUtil = require(appRoot + '/public/js/common.util.js');
var queryConfig = require(appRoot + '/config/queryConfig.js');
var sync = require('../util/sync.js');
var oracle = require('../util/oracle.js');
var pythonConfig = require(appRoot + '/config/pythonConfig');
var PythonShell = require('python-shell');
var transPantternVar = require('./transPattern');
var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');
var Step = require('step');

var insertTextClassification = queryConfig.uiLearningConfig.insertTextClassification;
var insertLabelMapping = queryConfig.uiLearningConfig.insertLabelMapping;
var selectLabel = queryConfig.uiLearningConfig.selectLabel;
var insertTypo = queryConfig.uiLearningConfig.insertTypo;
var insertDomainDic = queryConfig.uiLearningConfig.insertDomainDic;
var selectTypo = queryConfig.uiLearningConfig.selectTypo;
var updateTypo = queryConfig.uiLearningConfig.updateTypo;
var selectColumn = queryConfig.uiLearningConfig.selectColumn;

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, propertiesConfig.filepath.uploadsPath);
        },
        filename: function (req, file, cb) {
            var fileName = file.originalname.substring(0, file.originalname.lastIndexOf("."));
            var fileExt = file.originalname.substring(file.originalname.lastIndexOf(".") + 1, file.originalname.length);

            var tempName = new Date().isoNum(14) + "" + Math.floor(Math.random() * 99);

            file.originalname = fileName + "_" + tempName + "." + fileExt;

            cb(null, file.originalname);
        }
    }),
});

const defaults = {
    encoding: 'utf8',
};

/****************************************************************************************
 * ROUTER
 ****************************************************************************************/
router.get('/favicon.ico', function (req, res) {
    res.status(204).end();
});
router.get('/', function (req, res) {
    if (req.isAuthenticated()) res.render('user/docUpload', {
        currentUser: req.user,

    });
    else res.redirect("/logout");
});
router.post('/', function (req, res) {
    if (req.isAuthenticated()) res.render('user/docUpload', { currentUser: req.user });
    else res.redirect("/logout");
});

// [POST] 문서 리스트 조회 
router.post('/searchDocumentList', function (req, res) {
    if (req.isAuthenticated()) fnSearchDocumentList(req, res);
});
var callbackDocumentList = function (rows, req, res) {
    if (req.isAuthenticated()) res.send(rows);
};
var fnSearchDocumentList = function (req, res) {
    var condQuery = ``;
    var andQuery = ` AND (STATUS = 'ZZ' OR STATUS = '04') `;
    var orderQuery = ` ORDER BY DOCNUM ASC `;
    var param = {
        userId: commonUtil.nvl(req.body.userId),
        docNum: commonUtil.nvl(req.body.docNum),
        documentManager: commonUtil.nvl(req.body.documentManager),
        scanApproval: commonUtil.nvl(req.body.scanApproval),
        icrApproval: commonUtil.nvl(req.body.icrApproval),
        adminApproval: commonUtil.nvl(req.body.adminApproval)
    };
    if (param["adminApproval"] == 'Y') {
        andQuery = '';
    } else if (!commonUtil.isNull(param["scanApproval"]) && param["scanApproval"] == 'Y' && param["adminApproval"] == 'N') {
        condQuery += " AND UPLOADNUM = '" + req.session.userId + "' ";
    } else if (!commonUtil.isNull(param["icrApproval"]) && param["icrApproval"] == 'Y' && param["adminApproval"] == 'N') {
        condQuery += " AND ICRNUM = '" + req.session.userId + "' ";
    }

    //문서번호 입력 시
    if (!commonUtil.isNull(param["docNum"])) condQuery += ` AND DOCNUM LIKE '%${param["docNum"]}%' `;
    //스캔담당자 입력 시
    if (!commonUtil.isNull(param["documentManager"])) condQuery += ` AND UPLOADNUM LIKE '%${param["documentManager"]}%' `;

 
    var documentListQuery = queryConfig.invoiceRegistrationConfig.selectDocumentList;
    var listQuery = documentListQuery + condQuery + andQuery + orderQuery;
    //console.log("base listQuery : " + listQuery);
    commonDB.reqQuery(listQuery, callbackDocumentList, req, res);

};

// [POST] 문서 상세 리스트 조회
router.post('/searchDocumentDtlList', function (req, res) {
    if (req.isAuthenticated()) fnSearchDocumentDtlList(req, res);
});
var callbackDocumentDtlList = function (rows, req, res) {
    if (req.isAuthenticated()) res.send(rows);
};
var fnSearchDocumentDtlList = function (req, res) {
    var param = {
        seqNum: req.body.seqNum,
        docNum: req.body.docNum
    };
    var condQuery = ` AND A.DOCNUM = '${param.docNum}' `;
    var orderQuery = ` ORDER BY B.SEQNUM ASC `;

    var documentDtlListQuery = queryConfig.invoiceRegistrationConfig.selectDocumentDtlList;
    var listQuery = documentDtlListQuery + condQuery + orderQuery;
    console.log("dtl listQuery : " + listQuery);
    commonDB.reqQuery(listQuery, callbackDocumentDtlList, req, res);
};

// [POST] 문서 이미지 리스트 조회 
router.post('/searchDocumentImageList', function (req, res) {
    if (req.isAuthenticated()) fnSearchDocumentImageList(req, res);
});
var callbackDocumentImageList = function (rows, req, res) {
    if (req.isAuthenticated()) res.send(rows);
};
var fnSearchDocumentImageList = function (req, res) {
    var param = {
        imgId: req.body.imgId
    };
    var condQuery = ` AND A.IMGID = '${param.imgId}' `;
    var orderQuery = ` ORDER BY A.SEQNUM ASC `;

    var documentImageListQuery = queryConfig.invoiceRegistrationConfig.selectDocumentImageList;
    var listQuery = documentImageListQuery + condQuery + orderQuery;
    console.log("img listQuery : " + listQuery);
    commonDB.reqQuery(listQuery, callbackDocumentImageList, req, res);
};

/****************************************************************************************
 * FILE UPLOAD
 ****************************************************************************************/
router.post('/uploadFile', upload.any(), function (req, res) {
    sync.fiber(function () {
        var files = req.files;
        var convertedImagePath = propertiesConfig.filepath.uploadsPath;
        var fileInfoList = [];
        var status;
        var trainResultList;
        try {

            for(var i = 0; i < files.length; i++) {
    
                console.time("file upload & convert");
                var fileObj = files[i];
                var fileExt = fileObj.originalname.split('.')[1];
        
                if (fileExt.toLowerCase() === 'tif' || fileExt.toLowerCase() === 'jpg') {
                    var fileItem = {
                        imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
                        filePath: fileObj.path.replace(/\\/gi, '/'),
                        oriFileName: fileObj.originalname,
                        convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
                        convertFileName: fileObj.originalname.split('.')[0] + '.jpg',
                        fileExt: fileExt,
                        fileSize: fileObj.size,
                        contentType: fileObj.mimetype
                    };
                    fileInfoList.push(fileItem);
        
                    var ifile = convertedImagePath + fileObj.originalname;
                    var ofile = convertedImagePath + fileObj.originalname.split('.')[0] + '.jpg';
                    
                    var result = execSync('module\\imageMagick\\convert.exe -colorspace Gray -density 800x800 ' + ifile + ' ' + ofile);
                    if (result.status != 0) {
                        throw new Error(result.stderr);
                    }
                } else if (fileExt.toLowerCase() === 'png') {
                    var fileItem = {
                        imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
                        filePath: fileObj.path.replace(/\\/gi, '/'),
                        oriFileName: fileObj.originalname,
                        convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
                        convertFileName: fileObj.originalname.split('.')[0] + '.png',
                        fileExt: fileExt,
                        fileSize: fileObj.size,
                        contentType: fileObj.mimetype
                    };
                    fileInfoList.push(fileItem);
        
                    var ifile = convertedImagePath + fileObj.originalname;
                    var ofile = convertedImagePath + fileObj.originalname.split('.')[0] + '.png';
        
                } else if (fileExt.toLowerCase() === 'docx' || fileExt.toLowerCase() === 'doc'
                    || fileExt.toLowerCase() === 'xlsx' || fileExt.toLowerCase() === 'xls'
                    || fileExt.toLowerCase() === 'pptx' || fileExt.toLowerCase() === 'ppt'
                    || fileExt.toLowerCase() === 'pdf') {
        
        
                    var ifile = convertedImagePath + fileObj.originalname;
                    var ofile = convertedImagePath + fileObj.originalname.split('.')[0] + '.pdf';
        
                    var convertPdf = '';
        
                    //file decription 운영 경로
                    //execSync('java -jar C:/ICR/app/source/module/DrmDec.jar "' + ifile + '"');
        
                    //file convert MsOffice to Pdf
                    if (!(fileExt.toLowerCase() === 'pdf')) {
                        //convertPdf = execSync('"C:/Program Files/LibreOffice/program/python.exe" C:/ICR/app/source/module/unoconv/unoconv.py -f pdf -o "' + ofile + '" "' + ifile + '"');  //운영
                        convertPdf = execSync('"C:/Program Files/LibreOffice/program/python.exe" C:/projectWork/ocrService/module/unoconv/unoconv.py -f pdf -o "' + ofile + '" "' + ifile + '"');
                    }
        
                    ifile = convertedImagePath + fileObj.originalname.split('.')[0] + '.pdf';
                    ofile = convertedImagePath + fileObj.originalname.split('.')[0] + '.png';
        
                    //file convert Pdf to Png
                    if (convertPdf || fileExt.toLowerCase() === 'pdf') {
                        var result = execSync('module\\imageMagick\\convert.exe -density 300 -colorspace Gray -alpha remove -alpha off "' + ifile + '" "' + ofile + '"');
        
                        if (result.status != 0) {
                            throw new Error(result.stderr);
                        }
        
                        var isStop = false;
                        var j = 0;
        
                        while (!isStop) {
                            try { // 하나의 파일 안의 여러 페이지면
                                var convertFileFullPath = fileObj.path.split('.')[0] + '-' + j + '.png';
                                var stat = fs.statSync(convertFileFullPath);
                                if (stat) {
                                    var fileItem = {
                                        imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
                                        filePath: fileObj.path.replace(/\\/gi, '/'),
                                        oriFileName: fileObj.originalname,
                                        convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
                                        convertFileName: fileObj.originalname.split('.')[0] + '-' + j + '.png',
                                        fileExt: fileExt,
                                        fileSize: fileObj.size,
                                        contentType: fileObj.mimetype,
                                        imgCount : (j + 1)
                                    };
            
                                    fileInfoList.push(fileItem);
                                } else {
                                    isStop = true;
                                    break;
                                }
                            } catch (err) { // 하나의 파일 안의 한 페이지면
                                try {
                                    var convertFileFullPath = fileObj.path.split('.')[0] + '.png';
                                    var stat2 = fs.statSync(convertFileFullPath);
                                    if (stat2) {
                                        var fileItem = {
                                            imgId: new Date().isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000,
                                            filePath: fileObj.path.replace(/\\/gi, '/'),
                                            oriFileName: fileObj.originalname,
                                            convertedFilePath: convertedImagePath.replace(/\\/gi, '/'),
                                            convertFileName: fileObj.originalname.split('.')[0] + '.png',
                                            fileExt: fileExt,
                                            fileSize: fileObj.size,
                                            contentType: fileObj.mimetype,
                                            imgCount : (j + 1)
                                        };
                                        fileInfoList.push(fileItem);
                                        break;
                                    }
                                } catch (e) {
                                    break;
                                }
                            }
                            j++;
                        }
        
                    } else {
                        throw new Error("pdf convert fail");
                    }
                }
                console.timeEnd("file upload & convert");
            }
            console.log('upload suceess');
            status = 200;
        } catch(err) {
            status = 500;
            console.log(err);
        } finally {
            res.send({'status': status, 'fileInfoList': fileInfoList});        
        }
    });
});

router.post('/imgOcr', function (req, res) {
    sync.fiber(function () {
        var trainResultList = [];
        var status;
        var fileInfoList = req.body.fileInfoList;
        var docLabelDefList;
        var docAnswerDataList;
        try {
            //var imgid = sync.await(oracle.selectImgid(filepath, sync.defer()));
            //imgid = imgid.rows[0].IMGID;

            var fullFilePathList = [];
            for(var i = 0; i< fileInfoList.length; i++) {
                fullFilePathList.push(fileInfoList[i].convertedFilePath + fileInfoList[i].convertFileName);
            }

            for (var i = 0; i < fullFilePathList.length; i++) {
                var selOcr = sync.await(oracle.selectOcrData(fullFilePathList[i], sync.defer()));
                if (selOcr.length == 0) {
                    var ocrResult = sync.await(ocrUtil.localOcr(fullFilePathList[i], sync.defer()));

                    if (ocrResult.orientation != undefined && ocrResult.orientation != "Up") {
                        var angle = 0;

                        if (ocrResult.orientation == "Left") {
                            angle += 90;
                        } else if (ocrResult.orientation == "Right") {
                            angle += -90;
                        } else if (ocrResult.orientation == "Down") {
                            angle += 180;
                        }

                        execSync('module\\imageMagick\\convert.exe -colors 8 -density 300 -rotate "' + angle + '" ' + fullFilePathList[i] + ' ' + fullFilePathList[i]);
                        ocrResult = sync.await(ocrUtil.localOcr(fullFilePathList[i], sync.defer()));
                    }

                    for (var j = 0; j < 10; j++) {
                        if ((ocrResult.textAngle != undefined && ocrResult.textAngle > 0.03 || ocrResult.textAngle < -0.03)) {
                            var angle = 0;

                            var textAngle = Math.floor(ocrResult.textAngle * 100);

                            if (textAngle < 0) {
                                angle += 3;
                            } else if (textAngle == 17 || textAngle == 15 || textAngle == 14) {
                                angle = 10;
                            } else if (textAngle == 103) {
                                angle = 98;
                            }

                            execSync('module\\imageMagick\\convert.exe -colors 8 -density 300 -rotate "' + (textAngle + angle) + '" ' + fullFilePathList[i] + ' ' + fullFilePathList[i]);

                            ocrResult = sync.await(ocrUtil.localOcr(fullFilePathList[i], sync.defer()));
                        } else {
                            break;
                        }
                    }

                    sync.await(oracle.insertOcrData(fullFilePathList[i], JSON.stringify(ocrResult), sync.defer()));
                    selOcr = sync.await(oracle.selectOcrData(fullFilePathList[i], sync.defer()));
                }

                var seqNum = selOcr.SEQNUM;
                pythonConfig.columnMappingOptions.args = [];
                pythonConfig.columnMappingOptions.args.push(seqNum);
                //var resPyStr = sync.await(PythonShell.run('batchClassifyTest.py', pythonConfig.columnMappingOptions, sync.defer()));
                var resPyStr = sync.await(PythonShell.run('samClassifyTest.py', pythonConfig.columnMappingOptions, sync.defer()));
                var testStr = resPyStr[0].replace('b', '');
                testStr = testStr.replace(/'/g, '');
                var decode = new Buffer(testStr, 'base64').toString('utf-8');

                var resPyArr = JSON.parse(decode);
                resPyArr = sync.await(transPantternVar.trans(resPyArr, sync.defer()));
                resPyArr.fileName = fullFilePathList[i].substring(fullFilePathList[i].lastIndexOf('/') + 1);
                console.log(resPyArr);

                trainResultList.push(resPyArr);
                
                // tbl_icr_label_def 조회
                var docToptype = resPyArr.docCategory.DOCTOPTYPE;
                docLabelDefList = sync.await(oracle.selectDocLabelDefList(([docToptype]), sync.defer()));
                //console.log(docLabelDefList);
                
                // tbl_batch_po_answer_data 조회 docTotptye, filename
                //var filename = req.fileInfoList[0].oriFileName
                docAnswerDataList = sync.await(oracle.selectAnswerData(({'docToptype': docToptype}), sync.defer()));
                
                status = 200;
            }

        } catch (e) {
            status = 500;
            console.log(e);
        } finally {
            res.send({'status': status, 'trainResultList': trainResultList, 'docLabelDefList': docLabelDefList, 'docAnswerDataList': docAnswerDataList});
        }


    });
});


function batchLearnTraining(fileInfoList) {
    sync.fiber(function () {
        var result = {
            trainResult: []
        };
        try {
            //var imgid = sync.await(oracle.selectImgid(filepath, sync.defer()));
            //imgid = imgid.rows[0].IMGID;

            var fullFilePathList = [];
            for(var i = 0; i< fileInfoList.length; i++) {
                fullFilePathList.push(fileInfoList[i].convertedFilePath + fileInfoList[i].convertFileName);
            }

            for (var i = 0; i < fullFilePathList.length; i++) {
                var selOcr = sync.await(oracle.selectOcrData(fullFilePathList[i], sync.defer()));
                if (selOcr.length == 0) {
                    var ocrResult = sync.await(ocrUtil.localOcr(fullFilePathList[i], sync.defer()));

                    if ((ocrResult.textAngle != "undefined" && ocrResult.textAngle > 0.01 || ocrResult.textAngle < -0.01) || ocrResult.orientation != "Up") {
                        var angle = 0;

                        if (ocrResult.orientation == "Left") {
                            angle += 90;
                        } else if (ocrResult.orientation == "Right") {
                            angle += -90;
                        } else if (ocrResult.orientation == "Down") {
                            angle += 180;
                        }

                        angle += Math.floor(ocrResult.textAngle * 100);

                        if (angle < 0) {
                            angle += 2;
                        } else {
                            angle -= 1;
                        }

                        execSync('module\\imageMagick\\convert.exe -rotate "' + angle + '" ' + fullFilePathList[i] + ' ' + fullFilePathList[i]);

                        ocrResult = sync.await(ocrUtil.localOcr(fullFilePathList[i], sync.defer()));
                    }

                    sync.await(oracle.insertOcrData(fullFilePathList[i], JSON.stringify(ocrResult), sync.defer()));
                    selOcr = sync.await(oracle.selectOcrData(fullFilePathList[i], sync.defer()));
                }

                var seqNum = selOcr.SEQNUM;
                pythonConfig.columnMappingOptions.args = [];
                pythonConfig.columnMappingOptions.args.push(seqNum);
                //var resPyStr = sync.await(PythonShell.run('batchClassifyTest.py', pythonConfig.columnMappingOptions, sync.defer()));
                var resPyStr = sync.await(PythonShell.run('samClassifyTest.py', pythonConfig.columnMappingOptions, sync.defer()));
                var testStr = resPyStr[0].replace('b', '');
                testStr = testStr.replace(/'/g, '');
                var decode = new Buffer(testStr, 'base64').toString('utf-8');

                var resPyArr = JSON.parse(decode);
                resPyArr = sync.await(transPantternVar.trans(resPyArr, sync.defer()));
                console.log(resPyArr);

                
                result.trainResult.push(resPyArr);

            }

        } catch (e) {
            console.log(e);
        } finally {
            return done(null, result);
        }


    });
}

/****************************************************************************************
 * ML
 ****************************************************************************************/
// typoSentence ML
router.post('/typoSentence', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;

    process.on('uncaughtException', function (err) {
        console.log('uncaughtException : ' + err);
    });

    try {
        aimain.typoSentenceEval(data, function (result) {
            res.send({ 'fileName': fileName, 'data': result, nextType: 'dd' });
        });
    }
    catch (exception) {
        console.log(exception);
    }
});

// domainDictionary ML
router.post('/domainDictionary', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;

    process.on('uncaughtException', function (err) {
        console.log('uncaughtException : ' + err);
    });

    try {
        aimain.domainDictionaryEval(data, function (result) {
            res.send({ 'fileName': fileName, 'data': result, nextType: 'tc' });
        });
    } catch (exception) {
        console.log(exception);
    }


});

// textClassification ML
router.post('/textClassification', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;

    process.on('uncaughtException', function (err) {
        console.log('uncaughtException : ' + err);
    });

    try {
        aimain.textClassificationEval(data, function (result) {
            res.send({ 'fileName': fileName, 'data': result, nextType: 'st' });
        });
    } catch (exception) {
        console.log(exception);
    }
});

// statement classifiction ML
router.post('/statementClassification', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;

    process.on('uncaughtException', function (err) {
        console.log('uncaughtException : ' + err);
    });

    try {
        aimain.statementClassificationEval(data, function (result) {
            res.send({ 'fileName': fileName, 'data': result.data, 'docCategory': result.docCategory, nextType: 'lm' });
        });
    } catch (exception) {
        console.log(exception);
    }
});

// labelMapping ML
router.post('/labelMapping', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;
    var docCategory = (req.body.docCategory) ? req.body.docCategory : null;

    process.on('uncaughtException', function (err) {
        console.log('uncaughtException : ' + err);
    });

    try {
        aimain.labelMappingEval(data, function (result) {
            res.send({ 'fileName': fileName, 'data': result, 'docCategory': docCategory, nextType: 'sc' });
        });
    } catch (exception) {
        console.log(exception);
    }
});

// DB Columns select
router.post('/searchDBColumns', function (req, res) {
    var fileName = req.body.fileName;
    var data = req.body.data;
    var docCategory = (req.body.docCategory) ? req.body.docCategory : null;

    commonDB.reqQuery(selectColumn, function (rows, req, res) {
        res.send({ 'fileName': fileName, 'data': data, 'docCategory': docCategory, 'column': rows });
    }, req, res);
});

// uiTrain
router.post('/uiTrain', function (req, res) {
    var data = req.body.data;

    runTrain(data, function (result) {
        if (result == "true") {
            //text-classification train
            var exeTextString = 'python ' + appRoot + '\\ml\\cnn-text-classification\\train.py'
            exec(exeTextString, defaults, function (err, stdout, stderr) {
                //label-mapping train
                var exeLabelString = 'python ' + appRoot + '\\ml\\cnn-label-mapping\\train.py'
                exec(exeLabelString, defaults, function (err1, stdout1, stderr1) {
                    res.send("ui 학습 완료");
                });
            });
        }
    });

});

async function runTrain(data, callback) {
    try {
        let res = await textLabelTrain(data);
        callback(res);
    } catch (err) {
        console.error(err);
    }
}

function textLabelTrain(data) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            for (var i = 0; i < data.length; i++) {
                if (data[i].originText != null) {
                    //console.log(data[i].originText);
                    var originSplit = data[i].originText.split(" ");
                    var textSplit = data[i].text.split(" ");

                    var textleng = Math.abs(data[i].originText.length - data[i].text.length);

                    if (textleng < 4) {
                        //typo train
                        for (var ty = 0; ty < textSplit.length; ty++) {
                            if (originSplit[ty] != textSplit[ty]) {
                                var selTypoCond = [];
                                selTypoCond.push(textSplit[ty].toLowerCase());
                                let selTypoRes = await conn.execute(selectTypo, selTypoCond);

                                if (selTypoRes.rows[0] == null) {
                                    //insert
                                    let insTypoRes = await conn.execute(insertTypo, selTypoCond);
                                } else {
                                    //update
                                    var updTypoCond = [];
                                    updTypoCond.push(selTypoRes.rows[0].KEYWORD);
                                    let updTypoRes = await conn.execute(updateTypo, updTypoCond);
                                }

                            }
                        }
                    } else {
                        //domain dictionary train
                        var os = 0;
                        var osNext = 0;
                        var updText = "";
                        for (var j = 1; j < textSplit.length; j++) {
                            updText += textSplit[j] + ' ';
                        }
                        updText.slice(0, -1);

                        var domainText = [];
                        domainText.push(textSplit[0]);
                        domainText.push(updText);

                        for (var ts = 0; ts < domainText.length; ts++) {

                            for (os; os < originSplit.length; os++) {
                                if (ts == 1) {
                                    var insDicCond = [];

                                    //originword
                                    insDicCond.push(originSplit[os]);

                                    //frontword
                                    if (os == 0) {
                                        insDicCond.push("<<N>>");
                                    } else {
                                        insDicCond.push(originSplit[os - 1]);
                                    }

                                    //correctedword
                                    if (osNext == os) {
                                        insDicCond.push(domainText[ts]);
                                    } else {
                                        insDicCond.push("<<N>>");
                                    }

                                    //rearword
                                    if (os == originSplit.length - 1) {
                                        insDicCond.push("<<N>>");
                                    } else {
                                        insDicCond.push(originSplit[os + 1]);
                                    }

                                    let insDomainDicRes = await conn.execute(insertDomainDic, insDicCond);

                                } else if (domainText[ts].toLowerCase() != originSplit[os].toLowerCase()) {
                                    var insDicCond = [];

                                    //originword
                                    insDicCond.push(originSplit[os]);

                                    //frontword
                                    if (os == 0) {
                                        insDicCond.push("<<N>>");
                                    } else {
                                        insDicCond.push(originSplit[os - 1]);
                                    }

                                    //correctedword
                                    insDicCond.push("<<N>>");

                                    //rearword
                                    if (os == originSplit.length - 1) {
                                        insDicCond.push("<<N>>");
                                    } else {
                                        insDicCond.push(originSplit[os + 1]);
                                    }

                                    let insDomainDicRes = await conn.execute(insertDomainDic, insDicCond);

                                } else {
                                    os++;
                                    osNext = os;
                                    break;
                                }
                            }

                        }
                    }
                }
            }


            for (var i in data) {
                var selectLabelCond = [];
                selectLabelCond.push(data[i].column);

                let result = await conn.execute(selectLabel, selectLabelCond);

                if (result.rows[0] == null) {
                    data[i].textClassi = 'undefined';
                } else {
                    data[i].textClassi = result.rows[0].LABEL;
                    data[i].labelMapping = result.rows[0].ENKEYWORD;
                }

                var insTextClassifiCond = [];
                insTextClassifiCond.push(data[i].text);
                insTextClassifiCond.push(data[i].textClassi);

                let insResult = await conn.execute(insertTextClassification, insTextClassifiCond);
            }

            for (var i in data) {
                if (data[i].textClassi == "fixlabel" || data[i].textClassi == "entryrowlabel") {
                    var insLabelMapCond = [];
                    insLabelMapCond.push(data[i].text);
                    insLabelMapCond.push(data[i].labelMapping);

                    let insLabelMapRes = await conn.execute(insertLabelMapping, insLabelMapCond);

                    //console.log(insLabelMapRes);
                }
            }

            resolve("true");

        } catch (err) { // catches errors in getConnection and the query
            reject(err);
        } finally {
            if (conn) {   // the conn assignment worked, must release
                try {
                    await conn.release();
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
}


function createDocNum() {   
    
    sync.fiber(function () {
        var documentNum = 'ICR';
        var date = new Date();
        var yyyymmdd = String(date.getFullYear()) + String(date.getMonth() + 1) + String(date.getDate());

        try {
            
            var maxDocNum = sync.await(oracle.selectMaxDocNum(sync.defer()));            
            if (maxDocNum == 0) {
                documentNum += yyyymmdd + '0000001';
            } else {
                var Maxyyyymmdd = maxDocNum.substring(3, 11);
                if (Number(Maxyyyymmdd) < Number(yyyymmdd)) {
                    documentNum += yyyymmdd + '0000001';
                } else {
                    documentNum += Number(maxDocNum.substring(3, 18)) + 1;
                }
            }            
            return documentNum;
            
        } catch (e) {
            console.log(e);
        }
    });
    
}

router.post('/uiLearnTraining', function (req, res) {
    var ocrData = req.body.ocrData;
    var filePath = req.body.filePath;
    var fileName = req.body.fileName;
    var fileExt = filePath.split(".")[1];
    var imgId = req.body.fileDtlInfo.imgId;
    var returnObj;
    
    sync.fiber(function () {
        try {
            console.time("mlTime");
            pythonConfig.columnMappingOptions.args = [];
            pythonConfig.columnMappingOptions.args.push(JSON.stringify(ocrData));
            var resPyStr = sync.await(PythonShell.run('uiClassify.py', pythonConfig.columnMappingOptions, sync.defer()));
            var resPyArr = JSON.parse(resPyStr[0]);

            resPyArr = sync.await(transPantternVar.trans(resPyArr, sync.defer()));

            var colMappingList = sync.await(oracle.selectColumn(req, sync.defer()));
            var entryMappingList = sync.await(oracle.selectEntryMappingCls(req, sync.defer()));
            console.timeEnd("mlTime");
            returnObj = { code: 200, 'fileName': fileName, 'data': resPyArr, 'column': colMappingList, 'entryMappingList': entryMappingList };
        } catch (e) {
            console.log(resPyStr);
            returnObj = { 'code': 500, 'message': e };

        } finally {
            res.send(returnObj);
        }

    });
});

router.post('/refuseDoc', function (req, res) {
    var refuseType = req.body.refuseType;
    var docNumArr = req.body.docNumArr;
    var returnObj;

    sync.fiber(function () {
        try {
            sync.await(oracle.updateApprovalMaster([refuseType, docNumArr], sync.defer()));

            returnObj = { code: 200, data: 'refuse success'};
        } catch (e) {
            console.log(resPyStr);
            returnObj = { 'code': 500, 'message': e };

        } finally {
            res.send(returnObj);
        }

    });
});

module.exports = router;