'use strict';
var express = require('express');
var fs = require('fs');
var multer = require("multer");
var exceljs = require('exceljs');
var appRoot = require('app-root-path').path;
var router = express.Router();
var pythonConfig = require(appRoot + '/config/pythonConfig');
var PythonShell = require('python-shell');
var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');
var transPantternVar = require('./transPattern');
var sync = require('../util/sync.js');
var execSync = require('sync-exec');
var ocrUtil = require('../util/ocr.js');
var oracle = require('../util/oracle.js');

router.get('/favicon.ico', function (req, res) {
    res.status(204).end();
});

// templateRegistration.html 보여주기
router.get('/', function (req, res) {
    if (req.isAuthenticated()) res.render('user/templateRegistration', { currentUser: req.user });
    else res.redirect("/logout");
});

// adminLearning.html 보여주기
router.post('/', function (req, res) {
    if (req.isAuthenticated()) res.render('user/templateRegistration', { currentUser: req.user });
    else res.redirect("/logout");
});

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
        var ocrResultList = [];
        var docToptypeList = [];
        try {
            //var imgid = sync.await(oracle.selectImgid(filepath, sync.defer()));
            //imgid = imgid.rows[0].IMGID;

            var fullFilePathList = [];
            for(var i = 0; i< fileInfoList.length; i++) {
                fullFilePathList.push(fileInfoList[i].convertedFilePath + fileInfoList[i].convertFileName);
            }

            for (var i = 0; i < fullFilePathList.length; i++) {

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
                
                pythonConfig.columnMappingOptions.args = [];
                pythonConfig.columnMappingOptions.args.push(JSON.stringify(ocrResult));
                //var resPyStr = sync.await(PythonShell.run('batchClassifyTest.py', pythonConfig.columnMappingOptions, sync.defer()));
                var resPyStr = sync.await(PythonShell.run('notInsertClassifyTest.py', pythonConfig.columnMappingOptions, sync.defer()));
                var testStr = resPyStr[0].replace('b', '');
                testStr = testStr.replace(/'/g, '');
                var decode = new Buffer(testStr, 'base64').toString('utf-8');
                
                var resPyArr = JSON.parse(decode);
                resPyArr = sync.await(transPantternVar.trans(resPyArr, sync.defer()));
                resPyArr.fileName = fullFilePathList[i].substring(fullFilePathList[i].lastIndexOf('/') + 1);
                console.log(resPyArr);
                ocrResultList.push({
                    'fileName': resPyArr.fileName, 
                    'ocrTextList': ocrResult, 
                    'docCategory': resPyArr.docCategory
                })

                // TBL_ICR_DOC_TOPTYPE 조회
                let userId = req.session.userId;
                docToptypeList = sync.await(oracle.selectDocTopType([userId], sync.defer()));

                // tbl_icr_label_def 조회
                // var docToptype = resPyArr.docCategory.DOCTOPTYPE;
                // docLabelDefList = sync.await(oracle.selectDocLabelDefList(([docToptype]), sync.defer()));
                //console.log(docLabelDefList);
            
                status = 200;
            }

        } catch (e) {
            status = 500;
            console.log(e);
        } finally {
            res.send({'status': status, 'ocrResultList': ocrResultList, 'docToptypeList': docToptypeList, 'docLabelDefList': docLabelDefList});
        }


    });
});

router.post('/selectDocTypeList', function (req, res) {
    sync.fiber(function () {
        let returnObj = {};
        let docToptype = req.body.docToptype;
        let param = [docToptype];
        
        let docTypeList = sync.await(oracle.selectDocTypeList(param, sync.defer()));

        returnObj = {'docTypeList': docTypeList};
        res.send(returnObj);
    });
});

router.post('/selectDocLabelDefList', function (req, res) {
    sync.fiber(function () {
        let returnObj = {};
        let docToptype = req.body.docToptype;
        let param = [docToptype];
        
        let docLabelList = sync.await(oracle.selectDocLabelDefList(param, sync.defer()));

        returnObj = {'docLabelList': docLabelList};
        res.send(returnObj);
    });
});

module.exports = router;
