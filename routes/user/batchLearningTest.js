'use strict';
var express = require('express');
var fs = require('fs');
var multer = require("multer");
var exceljs = require('exceljs');
var appRoot = require('app-root-path').path;
var exec = require('child_process').exec;
var dbConfig = require(appRoot + '/config/dbConfig');
var queryConfig = require(appRoot + '/config/queryConfig.js');
var commonDB = require(appRoot + '/public/js/common.db.js');
var commonUtil = require(appRoot + '/public/js/common.util.js');
var logger = require('../util/logger');
var aimain = require('../util/aiMain');
var PythonShell = require('python-shell');
var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');
const FileHound = require('filehound');
const xlsx = require('xlsx');
var oracledb = require('oracledb');
var path = require('path');
const flatten = require('flatten');
const mz = require('mz/fs');
const async = require("async");
var oracle = require('../util/oracle.js');
var sync = require('../util/sync.js');
var ocrUtil = require('../util/ocr.js');
var batch = require('../util/batch.js');
var pythonConfig = require(appRoot + '/config/pythonConfig');
var mlStudio = require('../util/mlStudio.js');
var transPatternVar = require('./transPattern');
var Step = require('step');
var paging = require(appRoot + '/config/paging');
var execSync = require('sync-exec');

var selectBatchLearningDataListQuery = queryConfig.batchLearningConfig.selectBatchLearningDataList;
var selectBatchLearningDataQuery = queryConfig.batchLearningConfig.selectBatchLearningData;
var insertTextClassification = queryConfig.uiLearningConfig.insertTextClassification;
var insertLabelMapping = queryConfig.uiLearningConfig.insertLabelMapping;
var selectLabel = queryConfig.uiLearningConfig.selectLabel;
var insertTypo = queryConfig.uiLearningConfig.insertTypo;
var insertDomainDic = queryConfig.uiLearningConfig.insertDomainDic;
var selectTypo = queryConfig.uiLearningConfig.selectTypo;
var updateTypo = queryConfig.uiLearningConfig.updateTypo;
var selectBatchAnswerFile = queryConfig.batchLearningConfig.selectBatchAnswerFile;
var selectBatchAnswerDataToImgId = queryConfig.batchLearningConfig.selectBatchAnswerDataToImgId;

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            //cb(null, 'uploads/');
            cb(null, propertiesConfig.filepath.imagePath);
        },
        filename: function (req, file, cb) {
            cb(null, file.originalname);
        }
    }),
});
const defaults = {
    encoding: 'utf8'
};
var router = express.Router();

/*
//ml studio train test 용
router.get('/stest', function (req, res) {
    var data = {
        data: [
            { location: "1018,240,411,87", text: "apex", formLabel: 3, colLbl: 36, sid: "1018,240,25767,0,0,0,0" },
            { location: "574,847,492,32", text: "a solidarity- first insurance 2018", formLabel: 1, colLbl: 0, sid: "574,847,14459,97308,14535,14813,97309" },
            { location: "574,907,568,32", text: "a marine cargo surplus 2018 a inward", formLabel: 2, colLbl: 1, sid: "574,907,14459,16518,20299,21636,97309" }
        ],
        docCategory: { SEQNUM: "4", DOCNAME: "Nasco 계산서", DOCTYPE: "2", SAMPLEIMAGEPATH: "sample/nasco.jpg", score: 0.99 }
    };

    aimain.addTrainFromMLStudio(data, function (result) {
        res.send(result);
    });
});
*/
/*
router.get('/stest2', function (req, res) {
    var arg = {
        data: [{"location":"1018,240,411,87","text":"APEX"},{"location":"1019,338,409,23","text":"Partner of Choice"},{"location":"1562,509,178,25","text":"Voucher No"},{"location":"1562,578,206,25","text":"Voucher Date"},{"location":"206,691,274,27","text":"4153 Korean Re"},{"location":"208,756,525,34","text":"Proportional Treaty Statement"},{"location":"1842,506,344,25","text":"BV/HEO/2018/05/0626"},{"location":"1840,575,169,25","text":"01105/2018"},{"location":"206,848,111,24","text":"Cedant"},{"location":"206,908,285,24","text":"Class of Business"},{"location":"210,963,272,26","text":"Period of Quarter"},{"location":"207,1017,252,31","text":"Period of Treaty"},{"location":"206,1066,227,24","text":"Our Reference"},{"location":"226,1174,145,31","text":"Currency"},{"location":"227,1243,139,24","text":"Premium"},{"location":"226,1303,197,24","text":"Commission"},{"location":"226,1366,107,24","text":"Claims"},{"location":"227,1426,126,24","text":"Reserve"},{"location":"227,1489,123,24","text":"Release"},{"location":"227,1549,117,24","text":"Interest"},{"location":"227,1609,161,31","text":"Brokerage"},{"location":"233,1678,134,24","text":"Portfolio"},{"location":"227,1781,124,24","text":"Balance"},{"location":"574,847,492,32","text":": Solidarity- First Insurance 2018"},{"location":"574,907,568,32","text":": Marine Cargo Surplus 2018 - Inward"},{"location":"598,959,433,25","text":"01-01-2018 TO 31-03-2018"},{"location":"574,1010,454,25","text":": 01-01-2018 TO 31-12-2018"},{"location":"574,1065,304,25","text":": APEX/BORD/2727"},{"location":"629,1173,171,25","text":"JOD 1.00"},{"location":"639,1239,83,25","text":"25.53"},{"location":"639,1299,64,25","text":"5.74"},{"location":"639,1362,64,25","text":"0.00"},{"location":"639,1422,64,25","text":"7.66"},{"location":"639,1485,64,25","text":"0.00"},{"location":"639,1545,64,25","text":"0.00"},{"location":"639,1605,64,25","text":"0.64"},{"location":"648,1677,64,25","text":"0.00"},{"location":"641,1774,81,25","text":"11 .49"},{"location":"1706,1908,356,29","text":"APEX INSURANCE"}]
    };

    aimain.typoSentenceEval2(arg.data, function (typoResult) {
        arg.data = typoResult;
        console.log('execute typo ML');
        //console.log(arg);
        aimain.runFromMLStudio(arg, function (result) {
            res.send(result);
        });
    });
});
*/

/***************************************************************
 * Router
 * *************************************************************/
router.get('/favicon.ico', function (req, res) {
    res.status(204).end();
});
router.get('/', function (req, res) {                           // 배치학습 (GET)
    if (req.isAuthenticated()) res.render('user/batchLearningTest', { currentUser: req.user });
    else res.redirect("/logout");
});
// BLANK CALLBACK
var callbackBlank = function () { };

// [POST] 배치학습데이터 이미지 조회
router.post('/viewImage', function (req, res) {
    if (req.isAuthenticated()) fnViewImage(req, res);
});
var callbackViewImage = async function (rows, req, res) {
    console.log("rows : " + JSON.stringify(rows));
    
    if (req.isAuthenticated()) {
        if (commonUtil.isNull(rows[0].CONVERTEDIMGPATH)) {
            
            // 변환 이미지가 없을 경우 변환 후 UPDATE
            var imgId = rows[0].IMGID;
            var convertedImgPath = "/uploads/" + rows[0].FILENAME.split('.')[0] + '.jpg';
            var data = [convertedImgPath, imgId];
            var query = queryConfig.batchLearningConfig.updateConvertedImgPath;
            console.log("update query : " + query + " data : " + JSON.stringify(data));
            commonDB.reqQueryParam(query, data, callbackBlank, req, res);

            // 이미지 변환
            var ifile = rows[0].FILEPATH;
            var ofile = appRoot + "" + convertedImgPath;
            console.log("start convert img... " + ifile + " => " + ofile);
            await exec('module\\imageMagick\\convert.exe -density 800x800 ' + ifile + ' ' + ofile, function (err, out, code) {
                console.log("trans img err : " + err);
                console.log("trans img out : " + out);
                console.log("trans img code : " + code);
                res.send({ rows: rows, code: 201 });
            });
        } else {
            res.send({ rows: rows, code: 200 });
        }
    }
};
var fnViewImage = function (req, res) {
    console.log(`imgId : ${req.body.imgId}`);
    var data = [req.body.imgId];
    var query = queryConfig.batchLearningConfig.selectViewImage;
    commonDB.reqQueryParam(query, data, callbackViewImage, req, res);
};
// [POST] 배치학습데이터 이미지 데이터 조회 
router.post('/viewImageData', function (req, res) {
    if (req.isAuthenticated()) fnViewImageData(req, res);
});
var callbackViewImageData = function (rows, req, res) {
    console.log("rows : " + JSON.stringify(rows));
    if (req.isAuthenticated()) res.send(rows);
};
var fnViewImageData = function (req, res) {
    var data = [req.body.imgId];
    var query = queryConfig.batchLearningConfig.selectViewImageData;
    commonDB.reqQueryParam(query, data, callbackViewImageData, req, res);
};



// main menu batch learning 2 [POST] 배치학습데이터리스트 조회 
router.post('/searchBatchLearnDataList', function (req, res) {   
    if (req.isAuthenticated()) fnSearchBatchLearningDataList(req, res);
}); 
var callbackSelectBatchMLExportList = function (rows, req, res, batchData) {
    if (rows.length > 0) {
        res.send({ 'batchData': batchData, 'mlExportData': rows });
    } else {
        res.send({ 'batchData': batchData, 'mlExportData': [] });
    }
};

//main menu batch learning 3 
var callbackBatchLearningDataList = function (rows, req, res) {
    if (req.isAuthenticated()) {
        if (rows.length > 0) {
            var imgId = '(';
            for (var i in rows) {
                if (!rows[i].IMGID || rows[i].IMGID == '') {
                    continue;
                } else {
                    var temp = "'" + rows[i].IMGID.split('||')[0] + "',";
                    imgId += temp;
                }
            }
            imgId = imgId.substr(0, imgId.length - 1);
            imgId += ')';
            if (imgId == ")") {
                imgId = "('')";
            }
            commonDB.reqQueryF1param(queryConfig.batchLearningConfig.selectBatchMLExportList + imgId, callbackSelectBatchMLExportList, req, res, rows);
        } else {
            res.send(null);
        }
    }
};

//main menu batch learning 3
var callbackbatchLearnIdList = function (rows, req, res) {

    var status;
    if (!commonUtil.isNull(req.body.addCond)) {
        if (req.body.addCond == "LEARN_N") status = 'N';
        else if (req.body.addCond == "LEARN_Y") status = 'Y';
    }

    var cond = [];
    cond.push(status);
    var sql = "(";
    for (var i = 0; i < rows.length; i++) {
        cond.push(rows[i].FILEPATH);
        sql += (i > 0) ? ", :" + i : ":" + i;
    }
    sql += ") GROUP BY A.FILENAME ORDER BY A.FILENAME) T";

    commonDB.reqQueryParam(queryConfig.batchLearningConfig.selectBatchLearnDataList + sql, cond, callbackBatchLearningDataList, req, res);
};

//main menu batch learning 4 DB search
var fnSearchBatchLearningDataList = function (req, res) {

    sync.fiber(function () {
        try {
            var currentPage = req.body.page;

            //var retData = {};
            //hskim 20180828 일괄학습 화면 상단 셀렉트 버튼에서 값 가져오게 변경
            //var reqNum = 12;
            var mlData;
            var imgIdList = [];

            var originImageArr = sync.await(oracle.selectBatchLearnListTest(req, sync.defer()));
            var docTopType = sync.await(oracle.selectIcrDocTopType(req, sync.defer()));

            if (originImageArr.length != 0) {
                for (var i = 0; i < originImageArr.length; i++) {
                    imgIdList.push(originImageArr[i].IMGID);
                }
                mlData = sync.await(oracle.selectBatchLearnMlListTest(imgIdList, sync.defer()));

                res.send({ data: originImageArr, mlData: mlData, code: 200, docTopType: docTopType.rows, pageList: paging.pagination(currentPage, originImageArr[0].TOTCNT) });
            } else {
                res.send({ data: originImageArr, mlData: mlData, code: 200, docTopType: docTopType.rows });
            }


            // 9월11일 전 버전
            /*if (req.body.addCond == "LEARN_Y") {
                var predDoc = [];
                for (var i in filePathList) {
                    var result = sync.await(oracle.selectDocCategoryFilePath(filePathList[i], sync.defer()));
                    if (result.rows.length != 0) {
                         originImageArr[i].rows[0].DOCTYPE = result.rows[0].DOCTYPE;
                        originImageArr[i].rows[0].DOCNAME = result.rows[0].DOCNAME;
                    }
                }
                res.send({ data: originImageArr, mlData: mlData, code: 200 });
            } else {
                res.send({ data: originImageArr, mlData: mlData, code: 200 });
            }*/
        } catch (e) {
            console.log(e);
            res.send({ code: 400 });
        }
    });
    /*
    // 조건절
    var condQuery = "";
    var orderQuery = " ORDER BY A.regDate DESC";
    if (!commonUtil.isNull(req.body.addCond)) {
        if (req.body.addCond == "LEARN_N") condQuery = " AND A.status != 'Y' ";
        else if (req.body.addCond == "LEARN_Y") condQuery = " AND A.status = 'Y' ";
    }
    // LIMIT
    var listQuery = selectBatchLearningDataListQuery + condQuery + orderQuery;
    if (!commonUtil.isNull(req.body.startNum) || !commonUtil.isNull(req.body.moreNum)) {
        listQuery = "SELECT T.* FROM (" + listQuery + ") T WHERE rownum BETWEEN " + req.body.startNum + " AND " + req.body.moreNum;
    }
    */
    // var status;
    // if (!commonUtil.isNull(req.body.addCond)) {
    //     if (req.body.addCond == "LEARN_N") status = 'N';
    //     else if (req.body.addCond == "LEARN_Y") status = 'Y';
    // }
   
    // //console.log("리스트 조회 쿼리 : " + listQuery);

    // commonDB.reqQueryParam(queryConfig.batchLearningConfig.selectBatchLearnIdList, [status, req.body.startNum, req.body.moreNum], callbackbatchLearnIdList, req, res);

    //commonDB.reqQueryParam(queryConfig.batchLearningConfig.selectBatchLearnDataList, [ status, req.body.startNum, req.body.moreNum], callbackBatchLearningDataList, req, res);
};


// [POST] 배치학습데이터 조회
router.post('/searchBatchLearnData', function (req, res) {   
    if (req.isAuthenticated()) fnSearchBatchLearningData(req, res);
}); 
var callbackSelectBatchAnswerDataToImgId = function (rows, req, res, fileInfoList, orderbyRows) {
    if (rows.length == 0) {
        res.send({ code: 200, fileInfoList: fileInfoList, answerRows: orderbyRows, fileToPage: [] });
    } else {
        res.send({ code: 200, fileInfoList: fileInfoList, answerRows: orderbyRows, fileToPage: rows });
    }
};
var callbackSelectBatchAnswerFile = function (rows, req, res, fileInfoList) {
    var orderbyRows = [];
    var imgIdArr = [];
    for (var i in fileInfoList) {
        for (var j in rows) {
            if (fileInfoList[i].oriFileName == rows[j].FILEPATH) {
                orderbyRows.push(rows[j]);
                break;
            }
        }
    }

    for (var i in rows) {
        if (imgIdArr.length == 0) {
            imgIdArr.push(rows[i].IMGID);
            continue;
        }
        for (var j in imgIdArr) {          
            if (rows[i].IMGID == imgIdArr[j]) {
                break;
            }
            if (j == imgIdArr.length - 1) {
                imgIdArr.push(rows[i].IMGID);
            }
        }
    }
    
    var condQuery = "";
    if (imgIdArr.length > 0) {
        condQuery = "(";
        for (var i in imgIdArr) {
            condQuery += "" + imgIdArr[i] + ((i == imgIdArr.length - 1) ? ")" : ",");
        }
    } else {
        condQuery = "(null)";
    }
    console.log(selectBatchAnswerDataToImgId + condQuery);
    
    //res.send({ code: 200, fileInfoList: fileInfoList, answerRows: orderbyRows });
    commonDB.reqQueryF2param(selectBatchAnswerDataToImgId + condQuery, callbackSelectBatchAnswerDataToImgId, req, res, fileInfoList, orderbyRows);
};
var callbackBatchLearningData = function (rows, req, res) {
    var fileInfoList = [];
    console.log("배치학습데이터 : " + rows.length);

    for (var i = 0, x = rows.length; i < x; i++) {
        var oriFileName = rows[i].FILENAME;
        var _lastDot = oriFileName.lastIndexOf('.');
        var fileExt = oriFileName.substring(_lastDot + 1, oriFileName.length).toLowerCase();        // 파일 확장자
        var fileInfo = {
            imgId: rows[i].IMGID,
            filePath: rows[i].FILEPATH,
            oriFileName: rows[i].FILENAME,
            svrFileName: rows[i].SERVERFILENAME,
            convertFileName: rows[i].FILENAME.replace(fileExt, "jpg"),
            fileExt: rows[i].FILEEXTENSION,
            fileSize: rows[i].FILESIZE,
            contentType: rows[i].CONTENTTYPE ? rows[i].CONTENTTYPE : "",
            imgFileStNo: rows[i].IMGFILESTARTNO,
            imgFileEndNo: rows[i].IMGFILEENDNO,
            cscoNm: rows[i].CSCONM,
            ctNm: rows[i].CTNM,
            insStDt: rows[i].INSSTDT,
            insEndDt: rows[i].INSENDDT,
            curCd: rows[i].CURCD,
            pre: rows[i].PRE,
            com: rows[i].COM,
            brkg: rows[i].BRKG,
            txam: rows[i].TXAM,
            prrsCf: rows[i].PRRCF,
            prrsRls: rows[i].PRRSRLS,
            lsresCf: rows[i].LSRESCF,
            lsresRls: rows[i].LSRESRLS,
            cla: rows[i].CLA,
            exex: rows[i].EXEX,
            svf: rows[i].SVF,
            cas: rows[i].CAS,
            ntbl: rows[i].NTBL,
            cscoSaRfrnCnnt2: rows[i].CSCOSARFRNCNNT2,
            regId: rows[i].REGID,
            regDate: rows[i].REGDATE
        };
        fileInfoList.push(fileInfo);
    }

    // ANSWER
    var condQuery = "(";
    for (var i in rows) {
        var pathString = rows[i].FILEPATH;
        var pathArr = pathString.split('\\');
        condQuery += "'" + pathArr[pathArr.length - 1] + ((i == rows.length - 1) ? "')" : "',");
    }
    var answerQuery = selectBatchAnswerFile + condQuery;
    console.log("정답 파일 조회 쿼리 : " + answerQuery);
    commonDB.reqQueryF1param(answerQuery, callbackSelectBatchAnswerFile, req, res, fileInfoList);

    //res.send({ code: 200, fileInfoList: fileInfoList });
};
var fnSearchBatchLearningData = function (req, res) {
    var condition = " AND A.imgId IN (";
    for (var i = 0, x = req.body.imgIdArray.length; i < x; i++) {
        condition += "'" + req.body.imgIdArray[i] + "',";
    }
    condition = condition.slice(0, -1);
    condition += ")";
    var query = selectBatchLearningDataListQuery + condition;
    console.log("단건 조회 쿼리 : " + query);
    commonDB.reqQuery(query, callbackBatchLearningData, req, res);
};

// [POST] delete batchlearningdata (UPDATE)
var callbackDeleteBatchLearningData = function (rows, req, res) {
    if (req.isAuthenticated()) res.send({ code: 200, rows: rows });
};
router.post('/deleteBatchLearningData', function (req, res) {
    var condition = "(";
    for (var i = 0, x = req.body.imgIdArray.length; i < x; i++) {
        condition += "'" + req.body.imgIdArray[i] + "',";
    }
    condition = condition.slice(0, -1);
    condition += ")";
    var query = queryConfig.batchLearningConfig.deleteBatchLearningData + condition;
    commonDB.reqQuery(query, callbackDeleteBatchLearningData, req, res);
});

// 학습 엑셀 복사
router.post('/excelCopy', function (req, res) {
    var realExcelPath = propertiesConfig.filepath.realExcelPath;
    var files = fs.readdirSync(realExcelPath);
    var pathExcel, dataExcel;
    var tempPath1 = realExcelPath + path.sep + files[0];
    var tempPath2 = realExcelPath + path.sep + files[1];

    try {
        // 파일이 2개라는 것을 가정
        if (fs.statSync(tempPath1).size > fs.statSync(tempPath2).size) {
            dataExcel = tempPath1;
            pathExcel = tempPath2;
        } else {
            dataExcel = tempPath2;
            pathExcel = tempPath1;
        }

        fs.copyFileSync(dataExcel, appRoot + propertiesConfig.filepath.excelBatchFileData);
        fs.copyFileSync(pathExcel, appRoot + propertiesConfig.filepath.excelBatchFilePath);

        res.send({ code: 200, message: 'excel copy success' });
    } catch (e) {
        res.send({ code: 500, message: 'excel copy error'});
        console.error(e);
    }

});

// [POST] 엑셀 업로드
router.post('/excelUpload', upload.any(), function (req, res) {
    console.log("!!!!!!!!!!!!!!!!!!!!!!! excelupload");
    // 엑셀 파일 확인
    var pathExcel = propertiesConfig.filepath.excelBatchFilePath;
    var dataExcel = propertiesConfig.filepath.excelBatchFileData;
    console.log(dataExcel);
    var pathExcelWorkbook = xlsx.readFile(pathExcel);
    var dataExcelWorkbook = xlsx.readFile(dataExcel);
    var pathExcelSheet = pathExcelWorkbook.Sheets[pathExcelWorkbook.SheetNames[0]];
    var dataExcelSheet = dataExcelWorkbook.Sheets[dataExcelWorkbook.SheetNames[0]];

    var pathResult = [];
    var pathRow;
    var pathRowNum;
    var pathColNum;
    var pathRange = xlsx.utils.decode_range(pathExcelSheet['!ref']);
    for (pathRowNum = pathRange.s.r; pathRowNum <= pathRange.e.r; pathRowNum++) {
        pathRow = [];
        for (pathColNum = pathRange.s.c; pathColNum <= pathRange.e.c; pathColNum++) {
            var nextCell = pathExcelSheet[
                xlsx.utils.encode_cell({ r: pathRowNum, c: pathColNum })
            ];
            if (typeof nextCell === 'undefined') {
                pathRow.push(void 0);
            } else pathRow.push(nextCell.w);
        }
        pathResult.push(pathRow);
    }
    var dataResult = [];
    var dataRow;
    var dataRowNum;
    var dataColNum;
    var dataRange = xlsx.utils.decode_range(dataExcelSheet['!ref']);
    for (dataRowNum = dataRange.s.r; dataRowNum <= dataRange.e.r; dataRowNum++) {
        dataRow = [];
        for (dataColNum = dataRange.s.c; dataColNum <= dataRange.e.c; dataColNum++) {
            var nextCell = dataExcelSheet[
                xlsx.utils.encode_cell({ r: dataRowNum, c: dataColNum })
            ];
            if (typeof nextCell === 'undefined') {
                dataRow.push(void 0);
            } else dataRow.push(nextCell.w);
        }
        dataResult.push(dataRow);
    }

    commonDB.reqInsertExcelDataPath(pathResult, dataResult, req, res);
    //commonDB.reqInsertExcelData(dataResult);
    // insert filepath.xlsx 
    //for (var i = 1, x = pathResult.length; i < x; i++) { // 첫번째 행은 무시
    //    if (!commonUtil.isNull(pathResult[i][0])) {
    //        let data = [];
    //        for (var j = 0, y = pathResult[i].length; j < y; j++) {
    //            data.push(commonUtil.nvl(pathResult[i][j]));
    //        }
    //        console.log(`insert pathResult : ` + i);
    //        commonDB.queryNoRows(queryConfig.batchLearningConfig.insertBatchAnswerFile, data, callbackBlank);
    //    } else {
    //        console.log(`finish insert pathResult...`);
    //        continue;
    //    }
    //}
    // insert data.xlsx
    //for (var i = 1, x = dataResult.length; i < x; i++) { // 첫번째 행은 무시
    //    if (!commonUtil.isNull(dataResult[i][0])) {
    //        let data = [];
    //        for (var j = 0, y = dataResult[i].length; j < y; j++) {
    //            data.push(commonUtil.nvl(dataResult[i][j]));
    //        }
    //        console.log(`insert dataResult : ` + x);
    //        commonDB.queryNoRows(queryConfig.batchLearningConfig.insertBatchAnswerData, data, callbackBlank);
    //    } else {
    //        console.log(`finish insert dataResult...`);
    //        continue;
    //    }
    //}
    
});

// [POST] 이미지 업로드
router.post('/imageUpload', upload.any(), function (req, res) {
    const testFolder = propertiesConfig.filepath.imagePath;
    var files = req.files;
    var endCount = 0;
    var returnObj = [];
    var fileInfo = [];
    for (var i = 0; i < files.length; i++) {
        if (files[i].originalname.split('.')[1] === 'TIF' || files[i].originalname.split('.')[1] === 'tif' ||
            files[i].originalname.split('.')[1] === 'TIFF' || files[i].originalname.split('.')[1] === 'tiff') {
            var fileObj = files[i]; // 파일
            var oriFileName = fileObj.originalname; // 파일 원본명
            var filePath = fileObj.path;    // 파일 경로
            var ifile = filePath;
            var ofile = "/uploads/" + oriFileName.split('.')[0] + '.jpg';
            // 파일 정보 추출
            //var imgId = Math.random().toString(36).slice(2); // TODO : 임시로 imgId 생성
            var d = new Date();
            var imgId = d.isoNum(8) + "" + Math.floor(Math.random() * 9999999) + 1000000;
            //console.log("생성한 imgId와 길이 : " + imgId + " : " + imgId.length);
            
            //var filePath = ifile;    // 파일 경로
            
            var _lastDot = oriFileName.lastIndexOf('.');    
            var fileExt = oriFileName.substring(_lastDot+1, oriFileName.length).toLowerCase();        // 파일 확장자
            var fileSize = fileObj.size;  // 파일 크기
            var contentType = fileObj.mimetype; // 컨텐트타입
            var svrFileName = Math.random().toString(26).slice(2);  // 서버에 저장될 랜덤 파일명

            var fileParam = {
                imgId: imgId,
                filePath: filePath,
                oriFileName: oriFileName,
                convertFileName: ofile.split('.')[0] + '.jpg',
                fileExt: fileExt,
                fileSize: fileSize,
                contentType: contentType,
                svrFileName: svrFileName
            };

            console.log(`file Info : ${JSON.stringify(fileParam)}`);
            fileInfo.push(fileParam);
            returnObj.push(oriFileName.split('.')[0] + '.jpg');
            //console.log("upload ifile : " + ifile + " : oFile : " + ofile);
            exec('module\\imageMagick\\convert.exe -density 800x800 ' + ifile + ' ' + ofile, function (err, out, code) {
                if (endCount === files.length - 1) { // 모든 파일 변환이 완료되면
                    res.send({ code: 200, message: returnObj, fileInfo: fileInfo, type: 'image' });
                }
                endCount++;
            });
        }
    }
});

// [POST] INSERT fileInfo (파일정보)
var callbackInsertFileInfo = function (rows, req, res) {
    //console.log("upload fileInfo finish..");
    res.send({ code: 200, rows: rows });
};
router.post('/insertFileInfo', function (req, res) {
    //console.log("insert FILE INFO : " + JSON.stringify(req.body.fileInfo));
    var fileInfo = req.body.fileInfo;

    var imgId = fileInfo.imgId;
    var filePath = fileInfo.filePath;
    var oriFileName = fileInfo.oriFileName;
    var svrFileName = fileInfo.svrFileName;
    var convertFileName = fileInfo.convertFileName;
    var fileExt = fileInfo.fileExt;
    var fileSize = fileInfo.fileSize;
    var contentType = fileInfo.contentType;
    var regId = req.session.userId;

    var data = [imgId, filePath, oriFileName, svrFileName, fileExt, fileSize, contentType, 'B', regId];
    var dataDtl = [imgId, filePath.replace(oriFileName, convertFileName), convertFileName, svrFileName, 'jpg', 0, '', 'B', regId];
    
    //console.log("입력 데이터 : " + JSON.stringify(data));
    commonDB.reqQueryParam(queryConfig.batchLearningConfig.insertFileDtlInfo, data, callbackBlank, req, res);
    commonDB.reqQueryParam(queryConfig.batchLearningConfig.insertFileInfo, data, callbackInsertFileInfo, req, res);
});

router.post('/insertBatchLearningBaseData', function (req, res) {
    //console.log("insert BATCH LEARNING BASE DATA : " + JSON.stringify(req.body.fileInfo));
    var fileInfo = req.body.fileInfo;
    var filePath = fileInfo.filePath;
    filePath = filePath.replace("\\", "/");

    var imagePath = propertiesConfig.filepath.imagePath;
    imagePath = imagePath.replace("\\", "/");

    var selAnswerFile = `SELECT IMGID FROM TBL_BATCH_ANSWER_FILE WHERE 'C:\\ICR\\image' || FILEPATH = :filepath `;

    commonDB.reqQueryParam(selAnswerFile, [filePath], callbackSelectBatchLearningBaseData, req, res);

});

// [POST] INSERT batchLearningBaseData (기본정보)
var callbackSelectBatchLearningBaseData = function (rows, req, res) {

    var fileInfo = req.body.fileInfo;
    var convertedImgPath = fileInfo.convertFilePath + '\\' + fileInfo.convertFileName;
    var fileName = fileInfo.oriFileName;
    var filePath = fileInfo.filePath;
    var imgId = fileInfo.imgId;

    if (rows.length > 0) {
        imgId = rows[0].IMGID;
    }
    if (fileName.split('.')[1] === 'jpg') {
        convertedImgPath = '';
    }

    var data = [imgId, convertedImgPath, fileName, filePath];

    commonDB.reqQueryParam(queryConfig.batchLearningConfig.insertBatchLearningBaseData, data, callbackInsertBatchLearningBaseData, req, res);
};

var callbackInsertBatchLearningBaseData = function (rows, req, res) {
    res.send({ code: 200, rows: rows });
};

//
router.post('/execBatchLearningData2', function (req, res) {
    /*
    var arg = [
        { "location": "342,542,411,87", "text": "TEST" },
        { "location": "1045,294,409,23", "text": "Partner of Test" },
        { "location": "1923,543,178,25", "text": "Test No" },
        { "location": "1849,403,206,25", "text": "Test Date" },
        { "location": "234,546,274,27", "text": "7933 Korean Re" },
        { "location": "198,649,525,34", "text": "Proportional Treaty Statement" },
        { "location": "2390,409,344,25", "text": "BV/HEO/2018/08/0819" },
        { "location": "2101,534,169,25", "text": "01442/2018" },
        { "location": "211,858,111,24", "text": "Cedant" },
        { "location": "211,918,285,24", "text": "Class of Business" },
        { "location": "218,1001,272,26", "text": "Period of Quarter" },
        { "location": "212,1104,252,31", "text": "Period of Treaty" },
        { "location": "210,1066,227,24", "text": "Our Reference" },
        { "location": "210,1174,145,31", "text": "Currency" },
        { "location": "211,1243,139,24", "text": "Premium" },
        { "location": "220,1403,197,24", "text": "Commission" },
        { "location": "220,1466,107,24", "text": "Claims" },
        { "location": "222,1526,126,24", "text": "Reserve" },
        { "location": "222,1389,123,24", "text": "Release" },
        { "location": "222,1619,117,24", "text": "Interest" },
        { "location": "222,1509,161,31", "text": "Brokerage" },
        { "location": "235,1878,134,24", "text": "Portfolio" },
        { "location": "222,1481,124,24", "text": "Balance" },
        { "location": "440,899,492,32", "text": ": Test- First Insurance 2018" },
        { "location": "440,912,636,26", "text": ": Test contract 2018" },
        { "location": "708,888,433,25", "text": "07-05-2018 TO 19-08-2018" },
        { "location": "708,920,454,25", "text": ": 22-03-2018 TO 30-09-2018" },
        { "location": "475,998,304,25", "text": ": TEST/CTNM/8403" },
        { "location": "829,1173,171,25", "text": "JOD 1.50" },
        { "location": "839,1239,83,25", "text": "4.32" },
        { "location": "839,1299,58,25", "text": "34.21" },
        { "location": "839,1362,64,25", "text": "4.25" },
        { "location": "839,1422,58,25", "text": "1.65" },
        { "location": "839,1485,64,25", "text": "0.00" },
        { "location": "839,1545,64,25", "text": "2.38" },
        { "location": "839,1605,64,25", "text": "71.65" },
        { "location": "848,1677,64,25", "text": "33.10" },
        { "location": "1956,1879,356,29", "text": "TEST CONTRACT" }
    ];
    */
    console.log('--execBatchLearningDataV1.3');
    var arg = req.body.data;

    aimain.typoSentenceEval2(arg, function (typoResult) {
        arg = typoResult;
        console.log('execute typo ML');
        //console.log(arg);
        aimain.formLabelMapping2(arg, function (formLabelResult) {
            arg = formLabelResult;
            console.log('execute formLabelMapping ML');
            //console.log(arg);
            aimain.formMapping2(arg, function (formResult) {
                arg = formResult;
                console.log('execute formMapping ML');
                //console.log(arg);
                aimain.columnMapping2(arg, function (columnResult) {
                    arg = columnResult;
                    console.log('execute columnMapping ML');
                    //console.log(arg);                   
					res.send(arg);
                });
            });
        });
    });
});


// RUN batchLearningData
router.post('/execBatchLearningData', function (req, res) {
	console.log('--execBatchLearningDataV1.2');
    var arg = req.body.data;

    // Machine Learning v1.2
    aimain.typoSentenceEval(arg, function (typoResult) {
        arg = typoResult;
        console.log('execute typo ML');
        //console.log(arg);
        aimain.formLabelMapping(arg, function (formLabelResult) {
            arg = formLabelResult;
            console.log('execute formLabelMapping ML');
            //console.log(arg);
            aimain.formMapping(arg, function (formResult) {
                console.log('execute formMapping ML');
                arg = formResult;
                //console.log(arg);
                if (arg != null) {
                    aimain.columnMapping(arg, function (columnResult) {
                        if (columnResult) {
                            var columnArr = columnResult.split('^');
                            for (var i in columnArr) {
                                for (var j in arg.data) {
                                    var columnSid = columnArr[i].split('||')[0];
                                    if (columnSid.substring(columnSid.indexOf(',') + 1, columnSid.length) == arg.data[j].sid) {
                                        arg.data[j].colLbl = Number(columnArr[i].split('||')[1].replace(/\r\n/g, ''));
                                        break;
                                    }
                                }
                            }
                            console.log('execute columnMapping ML');
                            //console.log(arg);

                            // DB select (extraction OgCompanyName And ContractName)
                            var ctOgCompanyName = '';
                            var contractNames = []; // contractName Array
                            var exeQueryCount = 0; // query execute count 
                            var result = []; // function output
                            for (var i in arg.data) {
                                if (arg.data[i].formLabel == 1) {
                                    ctOgCompanyName = arg.data[i].text;
                                } else if (arg.data[i].formLabel == 2) {
                                    contractNames.push(arg.data[i].text);
                                }
                            }

                            for (var i in contractNames) {
                                commonDB.queryNoRows2(queryConfig.mlConfig.selectContractMapping, [ctOgCompanyName, contractNames[i]], function (rows) {
                                    exeQueryCount++;
                                    if (rows.length > 0) {
                                        result = rows;
                                    }
                                    if (exeQueryCount == contractNames.length) {
                                        arg.extOgAndCtnm = result;
                                        res.send(arg);
                                    }
                                });
                            }
                        } else {
                            var data = {};
                            data.data = typoResult;
                            res.send(data);
                        }
                    });
                } else {
                    var data = {};
                    data.data = typoResult;
                    res.send(data);
                }

            });
        });
    });

    /* 
    // Machine Learning v.1.0
    aimain.typoSentenceEval(arg, function (result1) {
        console.log("typo ML");
        aimain.domainDictionaryEval(result1, function (result2) {
            console.log("domain ML");
            aimain.textClassificationEval(result2, function (result3) {
                console.log("text ML");
                aimain.labelMappingEval(result3, function (result4) {
                    //console.log("labelMapping Result : " + JSON.stringify(result4));
                    console.log("label ML");
                    aimain.statementClassificationEval(result4, function (result5) {
                        console.log("statement ML");
                        res.send(result5);
                    })
                })
            })
        })
    });
    */

});

router.post('/uitraining', function (req, res) {

    var exeLabelString = 'python ' + appRoot + '\\ml\\FormLabelMapping\\train.py';
    exec(exeLabelString, defaults, function (err1, stdout1, stderr1) {
        if (err1) {
            console.error(err1);
            res.send({ code:500, message: 'Form Label Mapping training error' });
        } else {
            exeLabelString = 'python ' + appRoot + '\\ml\\FormMapping\\train.py';
            exec(exeLabelString, defaults, function (err2, stdout2, stderr2) {
                if (err2) {
                    console.error(err2);
                    res.send({ code: 500, message: 'Form  Mapping training error' });
                } else {
                    exeLabelString = 'python ' + appRoot + '\\ml\\ColumnMapping\\train.py';
                    exec(exeLabelString, defaults, function (err3, stdout3, stderr3) {
                        if (err3) {
                            console.error(err3);
                            res.send({ code: 500, message: 'Column Mapping training error' });
                        } else {
                            res.send({ code: 200, message: 'training OK' });
                        }
                    });
                }
            });
        }
        
    });

});

var callbackSelDbColumns = function (rows, req, res) {
    res.send({ code : 200, data: rows });
};
router.post('/selectColMappingCls', function (req, res) {

    commonDB.reqQuery(queryConfig.dbcolumnsConfig.selectColMappingCls, callbackSelDbColumns, req, res);
});

router.post('/insertDocLabelMapping', function (req, res) {
    var data = req.body.data;

    aimain.addLabelMappingTrain(data, function (resData) {
        console.log('insertDocLabelMapping ML');
        res.send({ code: 200, message: 'insertDocLabelMapping ML', data: resData });
    });
    
	/*
    var params = [];

    for (var i in data.data) {
        var classData = 0;
        if (data.data[i].column == 0 || data.data[i].column == 1) {            
            classData = String(Number(data.data[i].column) + 1);
        } else {
            classData = String(3);
        }
        params.push([data.data[i].sid, classData]);
    }

    var options = {
        autoCommit: true
    };
    commonDB.reqBatchQueryParam(queryConfig.mlConfig.insertDocLabelMapping, params, options, function (rowsAffected, req, res) {
        res.send({ code: 200, message: 'form label mapping insert' });
    }, req, res);
	*/

});

var callbackInsertDocMapping = function (rows, req, res) {
    res.send({ code: 200, message: 'form mapping insert' });
};
router.post('/insertDocMapping', function (req, res) {
    var data = req.body.data;
    
    aimain.addDocMappingTrain(data, function (resData) {
        console.log('insertDocMapping ML');
        res.send({ code: 200, message: 'insertDocMapping ML', data: resData });
    });
	
	/*
    var docCategory = req.body.docCategory;

    var item = '';
    for (var i in data) {
        item += (item == '')? data[i].sid : ',' + data[i].sid;
    }

    commonDB.reqQueryParam(queryConfig.mlConfig.insertDocMapping, [item, docCategory.DOCTYPE], callbackInsertDocMapping, req, res);
	*/

});

router.post('/insertColMapping', function (req, res) {
    var data = req.body.data;

    /*
    // ML Studio
    aimain.addTrainFromMLStudio(data, function (result) {
        res.send(result);
    });
    */
    
    // tensorflow
    aimain.addColumnMappingTrain(data, function (resData) {
        console.log('insertColMapping ML');
        res.send({ code: 200, message: 'insertColMapping ML' });
    });
    /*
    // 08.30
    aimain.addColumnMappingTrain2(data, function (resData) {
        console.log('insertColMapping ML');
        res.send({ code: 200, message: 'insertColMapping ML' });
    });
    */
    /*
    var docCategory = req.body.docCategory;
    var colMappingCount = 0;
    var params = [];

    for (var i in data) {
        if (data[i].column != 999) {
            var item = '';
            item += docCategory.DOCTYPE + ',' + data[i].sid;
            params.push([item, data[i].column]);
        }
    }

    var options = {
        autoCommit: true
    };
    commonDB.reqBatchQueryParam(queryConfig.mlConfig.insertColMapping, params, options, function (rowsAffected, req, res) {
        res.send({ code: 200, message: 'column mapping insert' });
    }, req, res);
	*/
});

var callbackInsertContractMapping = function (rows, req, res) {
    res.send({ code: 200, message: 'contract mapping insert'})
};
var callbackSelectBatchAnswerDataToFilePath = function (rows, data, req, res) {
    var extOgcompanyName, extCtnm, asOgcompanyName, asCtnm;

    if (rows.length > 0) {
        for (var i in data.data) {
            if (data.data[i].column == 0) {
                extOgcompanyName = data.data[i].text;
            } else if (data.data[i].column == 1) {
                extCtnm = data.data[i].text;
            }
        }
        asOgcompanyName = rows[0].OGCOMPANYNAME;
        asCtnm = rows[0].CTNM;
        commonDB.reqQueryParam(queryConfig.batchLearningConfig.insertContractMapping, [extOgcompanyName, extCtnm, asOgcompanyName, asCtnm], callbackInsertContractMapping, req, res);
    } else {
        res.send({ code: 200, message: 'contract mapping insert (not Answer)' })
    }
};
router.post('/insertContractMapping', function (req, res) {
    var data = req.body.data;
    var fileName = req.body.fileName;
    console.log(fileName);
    commonDB.reqQueryParam2(queryConfig.batchLearningConfig.selectBatchAnswerDataToFilePath, [fileName], callbackSelectBatchAnswerDataToFilePath, data, req, res);
});

/*
// [POST] insert batchLearningBaseData (tbl_batch_learning_data 기초정보)
var callbackInsertBatchLearningBaseData = function (rows, req, res) {
    //console.log("upload batchLearningBaseData finish..");
    res.send({ code: 200, rows: rows });
};
router.post('/insertBatchLearningBaseData', function (req, res) {
    var dataObj = req.body.dataObj;
    //console.log("insert dataObj " + JSON.stringify(dataObj));
    var imgId = dataObj.imgId; 
    var oriFileName = dataObj.oriFileName; 
    var regId = req.session.userId;

    var data = [imgId, imgFileStNo, imgFileEndNo, cscoNm, ctNm, insStDt, insEndDt, curCd, pre, com, brkg, txam, prrsCf, prrsRls, lsresCf, lsresRls, cla, exex, svf, cas, ntbl, cscoSaRfrnCnnt2, regId];
    commonDB.reqQueryParam(queryConfig.batchLearningConfig.insertBatchLearningData, data, callbackInsertBatchLearningData, req, res);

});
*/

// [POST] insert batchLearningData (tbl_batch_learning_data 전체정보)
var callbackInsertBatchLearningData = function (rows, req, res) {
    console.log("upload batchLearningData finish..");
    res.send({ code: 200, rows: rows });
};
router.post('/updateBatchLearningData', function (req, res) {
    var data = req.body.mldata.data;
    var billInfo = req.body.mldata.docCategory[0];
    var fileInfos = req.body.ocrData.fileInfo;
    var fileToPage = req.body.ocrData.fileToPage;
    var status = '';
    var keyCount = 0; // 컬럼 개수
    for (var key in data) keyCount++;
    if (keyCount == 49 ){ // 모든 컬럼 있으면
        status = 'Y';
    } else {
        status = 'N';
    }

    if (billInfo.DOCTYPE == 2) {

        var dataArr = [];

        for (var i in data) {
            if (data[i].colLbl == "CONTRACTNUM" || data[i].colLbl == "3") {
                var colData = [];
                colData.push(data[i]);

                var ctnmLoc = data[i].location.split(",");

                for (var j in data) {
                    var loc = data[j].location.split(",");

                    if ((data[j].colLbl == "PAIDSHARE" || data[j].colLbl == "6") && (Math.abs(ctnmLoc[1] - loc[1]) < 15)) {
                        colData.push(data[j]);
                    }

                    if ((data[j].colLbl == "OSLPERCENT" || data[j].colLbl == "7") && (Math.abs(ctnmLoc[1] - loc[1]) < 15)) {
                        colData.push(data[j]);
                    }

                    if ((data[j].colLbl == "OSLSHARE" || data[j].colLbl == "8") && (Math.abs(ctnmLoc[1] - loc[1]) < 15)) {
                        colData.push(data[j]);
                    }

                    if ((data[j].colLbl == "CURCD" || data[j].colLbl == "4") && (Math.abs(ctnmLoc[1] - loc[1]) < 15)) {
                        colData.push(data[j]);
                    }
                }
                dataArr.push(colData);
            }
        }

        runInsertLearnData(dataArr, req, res, function () {
            console.log("UpdateBatchLearningData finish..");
            res.send({ code: 200});
        });

    } else {

        runUpdateLearnData(data, req, res, function () {
            console.log("UpdateBatchLearningData finish..");
            res.send({ code: 200 });
        }); 

        //commonDB.reqQueryParam(queryConfig.batchLearningConfig.updateBatchLearningData + condImgIdQuery, dataArr, callbackUpdateBatchLearningData, req, res);
    }
});

async function runUpdateLearnData(data, req, res, callbackRunUpdateLearnData) {
    let ret;
    try {
        ret = await updateLearnData(data, req, res);
        console.log(ret);
        callbackRunUpdateLearnData(ret);
    } catch (err) {
        console.error(err);
    }
}

function updateLearnData(data, req, res) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);
            var fileInfos = req.body.ocrData.fileInfo;
            var billInfo = req.body.mldata.docCategory[0];

            var cond = "('" + fileInfos[0].oriFileName + "')";

            let selAnswerRes = await conn.execute(queryConfig.batchLearningConfig.selectMultiBatchAnswerDataToFilePath + cond);

            var dataCod = {};

            dataCod.STATEMENTDIV = billInfo.DOCNAME;

            for (var i in data) {
                if (data[i].colLbl == "CTOGCOMPANYNAMENM" || data[i].colLbl == "0") {
                    dataCod.CTOGCOMPANYNAMENM = data[i].text;
                } else if (data[i].colLbl == "CTNM" || data[i].colLbl == "1") {
                    dataCod.CTNM = data[i].text;
                } else if (data[i].colLbl == "UY" || data[i].colLbl == "2") {
                    dataCod.UY = data[i].text;
                } else if (data[i].colLbl == "CONTRACTNUM" || data[i].colLbl == "3") {
                    dataCod.CONTRACTNUM = data[i].text;
                } else if (data[i].colLbl == "CURCD" || data[i].colLbl == "4") {
                    dataCod.CURCD = data[i].text;
                } else if (data[i].colLbl == "PAIDPERCENT" || data[i].colLbl == "5") {
                    dataCod.PAIDPERCENT = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "PAIDSHARE" || data[i].colLbl == "6") {
                    dataCod.PAIDSHARE = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "OSLPERCENT" || data[i].colLbl == "7") {
                    dataCod.OSLPERCENT = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "OSLSHARE" || data[i].colLbl == "8") {
                    dataCod.OSLSHARE = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "GROSSPM") {
                    dataCod.GROSSPM = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "PM" || data[i].colLbl == "9") {
                    dataCod.PM = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "PMPFEND" || data[i].colLbl == "10") {
                    dataCod.PMPFEND = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "PMPFWOS" || data[i].colLbl == "11") {
                    dataCod.PMPFWOS = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "XOLPM" || data[i].colLbl == "12") {
                    dataCod.XOLPM = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "RETURNPM" || data[i].colLbl == "13") {
                    dataCod.RETURNPM = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "GROSSCN") {
                    dataCod.GROSSCN = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "CN" || data[i].colLbl == "14") {
                    dataCod.CN = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "PROFITCN" || data[i].colLbl == "15") {
                    dataCod.PROFITCN = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "BROKERAGE" || data[i].colLbl == "16") {
                    dataCod.BROKERAGE = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "TAX" || data[i].colLbl == "17") {
                    dataCod.TAX = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "OVERRIDINGCOM" || data[i].colLbl == "18") {
                    dataCod.OVERRIDINGCOM = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "CHARGE" || data[i].colLbl == "19") {
                    dataCod.CHARGE = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "PMRESERVERTD" || data[i].colLbl == "20") {
                    dataCod.PMRESERVERTD = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "PFPMRESERVERTD" || data[i].colLbl == "21") {
                    dataCod.PFPMRESERVERTD = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "PMRESERVERLD" || data[i].colLbl == "22") {
                    dataCod.PMRESERVERLD = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "PFPMRESERVERLD" || data[i].colLbl == "23") {
                    dataCod.PFPMRESERVERLD = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "CLAIM" || data[i].colLbl == "24") {
                    dataCod.CLAIM = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "LOSSRECOVERY" || data[i].colLbl == "25") {
                    dataCod.LOSSRECOVERY = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "CASHLOSS" || data[i].colLbl == "26") {
                    dataCod.CASHLOSS = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "CASHLOSSRD" || data[i].colLbl == "27") {
                    dataCod.CASHLOSSRD = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "LOSSRR" || data[i].colLbl == "28") {
                    dataCod.LOSSRR = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "LOSSRR2" || data[i].colLbl == "29") {
                    dataCod.LOSSRR2 = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "LOSSPFEND" || data[i].colLbl == "30") {
                    dataCod.LOSSPFEND = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "LOSSPFWOA" || data[i].colLbl == "31") {
                    dataCod.LOSSPFWOA = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "INTEREST" || data[i].colLbl == "32") {
                    dataCod.INTEREST = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "TAXON" || data[i].colLbl == "33") {
                    dataCod.TAXON = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "MISCELLANEOUS" || data[i].colLbl == "34") {
                    dataCod.MISCELLANEOUS = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "PMBL") {
                    dataCod.PMBL = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "CMBL") {
                    dataCod.CMBL = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "NTBL") {
                    dataCod.NTBL = data[i].text.replace(/ |,/g, '');
                } else if (data[i].colLbl == "CSCOSARFRNCNNT2" || data[i].colLbl == "35") {
                    dataCod.CSCOSARFRNCNNT2 = data[i].text;
                }
            }

            var dataArr = [
                "N",
                commonUtil.nvl(dataCod.entryNo),
                commonUtil.nvl(dataCod.STATEMENTDIV),
                commonUtil.nvl(dataCod.CONTRACTNUM),
                commonUtil.nvl(dataCod.ogCompanyCode),
                commonUtil.nvl(dataCod.CTOGCOMPANYNAMENM),
                commonUtil.nvl(dataCod.brokerCode),
                commonUtil.nvl(dataCod.brokerName),
                commonUtil.nvl(dataCod.CTNM),
                commonUtil.nvl(dataCod.insstdt),
                commonUtil.nvl(dataCod.insenddt),
                commonUtil.nvl(dataCod.UY),
                commonUtil.nvl(dataCod.CURCD),
                commonUtil.nvl2(dataCod.PAIDPERCENT, 0),
                commonUtil.nvl2(dataCod.PAIDSHARE, 0),
                commonUtil.nvl2(dataCod.OSLPERCENT, 0),
                commonUtil.nvl2(dataCod.OSLSHARE, 0),
                commonUtil.nvl2(dataCod.GROSSPM, 0),
                commonUtil.nvl2(dataCod.PM, 0),
                commonUtil.nvl2(dataCod.PMPFEND, 0),
                commonUtil.nvl2(dataCod.PMPFWOS, 0),
                commonUtil.nvl2(dataCod.XOLPM, 0),
                commonUtil.nvl2(dataCod.RETURNPM, 0),
                commonUtil.nvl2(dataCod.GROSSCN, 0),
                commonUtil.nvl2(dataCod.CN, 0),
                commonUtil.nvl2(dataCod.PROFITCN, 0),
                commonUtil.nvl2(dataCod.BROKERAGE, 0),
                commonUtil.nvl2(dataCod.TAX, 0),
                commonUtil.nvl2(dataCod.OVERRIDINGCOM, 0),
                commonUtil.nvl2(dataCod.CHARGE, 0),
                commonUtil.nvl2(dataCod.PMRESERVERTD, 0),
                commonUtil.nvl2(dataCod.PFPMRESERVERTD, 0),
                commonUtil.nvl2(dataCod.PMRESERVERLD, 0),
                commonUtil.nvl2(dataCod.PFPMRESERVERLD, 0),
                commonUtil.nvl2(dataCod.CLAIM, 0),
                commonUtil.nvl2(dataCod.LOSSRECOVERY, 0),
                commonUtil.nvl2(dataCod.CASHLOSS, 0),
                commonUtil.nvl2(dataCod.CASHLOSSRD, 0),
                commonUtil.nvl2(dataCod.LOSSRR, 0),
                commonUtil.nvl2(dataCod.LOSSRR2, 0),
                commonUtil.nvl2(dataCod.LOSSPFEND, 0),
                commonUtil.nvl2(dataCod.LOSSPFWOA, 0),
                commonUtil.nvl2(dataCod.INTEREST, 0),
                commonUtil.nvl2(dataCod.TAXON, 0),
                commonUtil.nvl2(dataCod.MISCELLANEOUS, 0),
                commonUtil.nvl2(dataCod.PMBL, 0),
                commonUtil.nvl2(dataCod.CMBL, 0),
                commonUtil.nvl2(dataCod.NTBL, 0),
                commonUtil.nvl2(dataCod.cscosarfrncnnt2, 0)
            ];

            if (selAnswerRes.rows[0] != null) {
                //정답파일 비교
                var answerData = getAnswerData(selAnswerRes);
                var boolAnswer = getAnswerBool(answerData, dataCod);

                if (boolAnswer) {
                    //정답 Y update
                    if (dataArr[0] == "N") {
                        dataArr[0] = "Y";
                    }
                }
            }

            var condImgIdQuery = '('
            for (var i in fileInfos) {
                condImgIdQuery += "'";
                condImgIdQuery += fileInfos[i].imgId;
                condImgIdQuery += (i != fileInfos.length - 1) ? "'," : "')";
            }

            let updAnswerRes = await conn.execute(queryConfig.batchLearningConfig.updateBatchLearningData + condImgIdQuery, dataArr);
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

function getAnswerBool(answerData, dataCod) {
    var boolAnswer = true;

    if (answerData.UY != null && answerData.UY != dataCod.UY) {
        return boolAnswer = false;
    }
    if (answerData.CURCD != null && answerData.CURCD != dataCod.CURCD) {
        return boolAnswer = false;
    }
    if (answerData.PAIDPERCENT != null && answerData.PAIDPERCENT != dataCod.PAIDPERCENT) {
        return boolAnswer = false;
    }
    if (answerData.PAIDSHARE != null && answerData.PAIDSHARE != dataCod.PAIDSHARE) {
        return boolAnswer = false;
    }
    if (answerData.OSLPERCENT != null && answerData.OSLPERCENT != dataCod.OSLPERCENT) {
        return boolAnswer = false;
    }
    if (answerData.OSLSHARE != null && answerData.OSLSHARE != dataCod.OSLSHARE) {
        return boolAnswer = false;
    }
    if (answerData.GROSSPM != null && answerData.GROSSPM != dataCod.GROSSPM) {
        return boolAnswer = false;
    }
    if (answerData.PM != null && answerData.PM != dataCod.PM) {
        return boolAnswer = false;
    }
    if (answerData.PMPFEND != null && answerData.PMPFEND != dataCod.PMPFEND) {
        return boolAnswer = false;
    }
    if (answerData.PMPFWOS != null && answerData.PMPFWOS != dataCod.PMPFWOS) {
        return boolAnswer = false;
    }
    if (answerData.XOLPM != null && answerData.XOLPM != dataCod.XOLPM) {
        return boolAnswer = false;
    }
    if (answerData.RETURNPM != null && answerData.RETURNPM != dataCod.RETURNPM) {
        return boolAnswer = false;
    }
    if (answerData.GROSSCN != null && answerData.GROSSCN != dataCod.GROSSCN) {
        return boolAnswer = false;
    }
    if (answerData.PROFITCN != null && answerData.PROFITCN != dataCod.PROFITCN) {
        return boolAnswer = false;
    }
    if (answerData.BROKERAGE != null && answerData.BROKERAGE != dataCod.BROKERAGE) {
        return boolAnswer = false;
    }
    if (answerData.TAX != null && answerData.TAX != dataCod.TAX) {
        return boolAnswer = false;
    }
    if (answerData.OVERRIDINGCOM != null && answerData.OVERRIDINGCOM != dataCod.OVERRIDINGCOM) {
        return boolAnswer = false;
    }
    if (answerData.PMRESERVERTD1 != null && answerData.PMRESERVERTD1 != dataCod.PMRESERVERTD1) {
        return boolAnswer = false;
    }
    if (answerData.PFPMRESERVERTD1 != null && answerData.PFPMRESERVERTD1 != dataCod.PFPMRESERVERTD1) {
        return boolAnswer = false;
    }
    if (answerData.PMRESERVERTD2 != null && answerData.PMRESERVERTD2 != dataCod.PMRESERVERTD2) {
        return boolAnswer = false;
    }
    if (answerData.PFPMRESERVERTD2 != null && answerData.PFPMRESERVERTD2 != dataCod.PFPMRESERVERTD2) {
        return boolAnswer = false;
    }
    if (answerData.CLAIM != null && answerData.CLAIM != dataCod.CLAIM) {
        return boolAnswer = false;
    }
    if (answerData.LOSSRECOVERY != null && answerData.LOSSRECOVERY != dataCod.LOSSRECOVERY) {
        return boolAnswer = false;
    }
    if (answerData.CASHLOSS != null && answerData.CASHLOSS != dataCod.CASHLOSS) {
        return boolAnswer = false;
    }
    if (answerData.CASHLOSSRD != null && answerData.CASHLOSSRD != dataCod.CASHLOSSRD) {
        return boolAnswer = false;
    }
    if (answerData.LOSSRR != null && answerData.LOSSRR != dataCod.LOSSRR) {
        return boolAnswer = false;
    }
    if (answerData.LOSSRR2 != null && answerData.LOSSRR2 != dataCod.LOSSRR2) {
        return boolAnswer = false;
    }
    if (answerData.LOSSPFEND != null && answerData.LOSSPFEND != dataCod.LOSSPFEND) {
        return boolAnswer = false;
    }
    if (answerData.LOSSPFWOA != null && answerData.LOSSPFWOA != dataCod.LOSSPFWOA) {
        return boolAnswer = false;
    }
    if (answerData.INTEREST != null && answerData.INTEREST != dataCod.INTEREST) {
        return boolAnswer = false;
    }
    if (answerData.TAXON != null && answerData.TAXON != dataCod.TAXON) {
        return boolAnswer = false;
    }
    if (answerData.MISCELLANEOUS != null && answerData.MISCELLANEOUS != dataCod.MISCELLANEOUS) {
        return boolAnswer = false;
    }
    if (answerData.PMBL != null && answerData.PMBL != dataCod.PMBL) {
        return boolAnswer = false;
    }
    if (answerData.CMBL != null && answerData.CMBL != dataCod.CMBL) {
        return boolAnswer = false;
    }
    if (answerData.NTBL != null && answerData.NTBL != dataCod.NTBL) {
        return boolAnswer = false;
    }
    if (answerData.CSCOSARFRNCNNT2 != null && answerData.CSCOSARFRNCNNT2 != dataCod.CSCOSARFRNCNNT2) {
        return boolAnswer = false;
    }

    return boolAnswer;
}

function getAnswerData(selAnswerRes) {
    var answerData = {};
    answerData.UY = selAnswerRes.rows[0].UY;
    answerData.CURCD = selAnswerRes.rows[0].CURCD;
    answerData.PAIDPERCENT = selAnswerRes.rows[0].PAIDPERCENT;
    answerData.PAIDSHARE = selAnswerRes.rows[0].PAIDSHARE;
    answerData.OSLPERCENT = selAnswerRes.rows[0].OSLPERCENT;
    answerData.OSLSHARE = selAnswerRes.rows[0].OSLSHARE;
    answerData.GROSSPM = selAnswerRes.rows[0].GROSSPM;
    answerData.PM = selAnswerRes.rows[0].PM;
    answerData.PMPFEND = selAnswerRes.rows[0].PMPFEND;
    answerData.PMPFWOS = selAnswerRes.rows[0].PMPFWOS;
    answerData.XOLPM = selAnswerRes.rows[0].XOLPM;
    answerData.RETURNPM = selAnswerRes.rows[0].RETURNPM;
    answerData.GROSSCN = selAnswerRes.rows[0].GROSSCN;
    answerData.CN = selAnswerRes.rows[0].CN;
    answerData.PROFITCN = selAnswerRes.rows[0].PROFITCN;
    answerData.BROKERAGE = selAnswerRes.rows[0].BROKERAGE;
    answerData.TAX = selAnswerRes.rows[0].TAX;
    answerData.OVERRIDINGCOM = selAnswerRes.rows[0].OVERRIDINGCOM;
    answerData.CHARGE = selAnswerRes.rows[0].CHARGE;
    answerData.PMRESERVERTD1 = selAnswerRes.rows[0].PMRESERVERTD1;
    answerData.PFPMRESERVERTD1 = selAnswerRes.rows[0].PFPMRESERVERTD1;
    answerData.PMRESERVERTD2 = selAnswerRes.rows[0].PMRESERVERTD2;
    answerData.PFPMRESERVERTD2 = selAnswerRes.rows[0].PFPMRESERVERTD2;
    answerData.CLAIM = selAnswerRes.rows[0].CLAIM;
    answerData.LOSSRECOVERY = selAnswerRes.rows[0].LOSSRECOVERY;
    answerData.CASHLOSS = selAnswerRes.rows[0].CASHLOSS;
    answerData.CASHLOSSRD = selAnswerRes.rows[0].CASHLOSSRD;
    answerData.LOSSRR = selAnswerRes.rows[0].LOSSRR;
    answerData.LOSSRR2 = selAnswerRes.rows[0].LOSSRR2;
    answerData.LOSSPFEND = selAnswerRes.rows[0].LOSSPFEND;
    answerData.LOSSPFWOA = selAnswerRes.rows[0].LOSSPFWOA;
    answerData.INTEREST = selAnswerRes.rows[0].INTEREST;
    answerData.TAXON = selAnswerRes.rows[0].TAXON;
    answerData.MISCELLANEOUS = selAnswerRes.rows[0].MISCELLANEOUS;
    answerData.PMBL = selAnswerRes.rows[0].PMBL;
    answerData.CMBL = selAnswerRes.rows[0].CMBL;
    answerData.NTBL = selAnswerRes.rows[0].NTBL;
    answerData.CSCOSARFRNCNNT2 = selAnswerRes.rows[0].CSCOSARFRNCNNT2;

    return answerData;
}


async function runInsertLearnData(data, req, res, callbackRunInsertLearnData) {
    let ret;
    try {
        ret = await insertLearnData(data, req, res);
        console.log(ret);
        callbackRunInsertLearnData(ret);
    } catch (err) {
        console.error(err);
    }
}

function insertLearnData(data, req, res) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            console.log(data);
            var fileInfos = req.body.ocrData.fileInfo;
            var billInfo = req.body.mldata.docCategory[0];

            for (var j in data) {
                let LearnDataRes = await conn.execute("select count(*) as count from tbl_batch_learn_data where imgid = :imgid", [fileInfos[0].imgId]);
                var rowData = data[j];
                var dataCod = {};

                dataCod.STATEMENTDIV = billInfo.DOCNAME;

                for (var i in rowData) {
                    if (rowData[i].colLbl == "CTOGCOMPANYNAMENM" || rowData[i].colLbl == "0") {
                        dataCod.CTOGCOMPANYNAMENM = rowData[i].text;
                    } else if (rowData[i].colLbl == "CTNM" || rowData[i].colLbl == "1") {
                        dataCod.CTNM = rowData[i].text;
                    } else if (rowData[i].colLbl == "UY" || rowData[i].colLbl == "2") {
                        dataCod.UY = rowData[i].text;
                    } else if (rowData[i].colLbl == "CONTRACTNUM" || rowData[i].colLbl == "3") {
                        dataCod.CONTRACTNUM = rowData[i].text;
                    } else if (rowData[i].colLbl == "CURCD" || rowData[i].colLbl == "4") {
                        dataCod.CURCD = rowData[i].text;
                    } else if (rowData[i].colLbl == "PAIDPERCENT" || rowData[i].colLbl == "5") {
                        dataCod.PAIDPERCENT = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "PAIDSHARE" || rowData[i].colLbl == "6") {
                        dataCod.PAIDSHARE = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "OSLPERCENT" || rowData[i].colLbl == "7") {
                        dataCod.OSLPERCENT = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "OSLSHARE" || rowData[i].colLbl == "8") {
                        dataCod.OSLSHARE = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "GROSSPM") {
                        dataCod.GROSSPM = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "PM" || rowData[i].colLbl == "9") {
                        dataCod.PM = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "PMPFEND" || rowData[i].colLbl == "10") {
                        dataCod.PMPFEND = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "PMPFWOS" || rowData[i].colLbl == "11") {
                        dataCod.PMPFWOS = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "XOLPM" || rowData[i].colLbl == "12") {
                        dataCod.XOLPM = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "RETURNPM" || rowData[i].colLbl == "13") {
                        dataCod.RETURNPM = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "GROSSCN") {
                        dataCod.GROSSCN = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "CN" || rowData[i].colLbl == "14") {
                        dataCod.CN = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "PROFITCN" || rowData[i].colLbl == "15") {
                        dataCod.PROFITCN = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "BROKERAGE" || rowData[i].colLbl == "16") {
                        dataCod.BROKERAGE = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "TAX" || rowData[i].colLbl == "17") {
                        dataCod.TAX = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "OVERRIDINGCOM" || rowData[i].colLbl == "18") {
                        dataCod.OVERRIDINGCOM = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "CHARGE" || rowData[i].colLbl == "19") {
                        dataCod.CHARGE = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "PMRESERVERTD" || rowData[i].colLbl == "20") {
                        dataCod.PMRESERVERTD = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "PFPMRESERVERTD" || rowData[i].colLbl == "21") {
                        dataCod.PFPMRESERVERTD = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "PMRESERVERLD" || rowData[i].colLbl == "22") {
                        dataCod.PMRESERVERLD = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "PFPMRESERVERLD" || rowData[i].colLbl == "23") {
                        dataCod.PFPMRESERVERLD = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "CLAIM" || rowData[i].colLbl == "24") {
                        dataCod.CLAIM = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "LOSSRECOVERY" || rowData[i].colLbl == "25") {
                        dataCod.LOSSRECOVERY = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "CASHLOSS" || rowData[i].colLbl == "26") {
                        dataCod.CASHLOSS = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "CASHLOSSRD" || rowData[i].colLbl == "27") {
                        dataCod.CASHLOSSRD = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "LOSSRR" || rowData[i].colLbl == "28") {
                        dataCod.LOSSRR = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "LOSSRR2" || rowData[i].colLbl == "29") {
                        dataCod.LOSSRR2 = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "LOSSPFEND" || rowData[i].colLbl == "30") {
                        dataCod.LOSSPFEND = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "LOSSPFWOA" || rowData[i].colLbl == "31") {
                        dataCod.LOSSPFWOA = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "INTEREST" || rowData[i].colLbl == "32") {
                        dataCod.INTEREST = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "TAXON" || rowData[i].colLbl == "33") {
                        dataCod.TAXON = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "MISCELLANEOUS" || rowData[i].colLbl == "34") {
                        dataCod.MISCELLANEOUS = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "PMBL") {
                        dataCod.PMBL = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "CMBL") {
                        dataCod.CMBL = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "NTBL") {
                        dataCod.NTBL = rowData[i].text.replace(/ |,/g, '');
                    } else if (rowData[i].colLbl == "CSCOSARFRNCNNT2" || rowData[i].colLbl == "35") {
                        dataCod.CSCOSARFRNCNNT2 = rowData[i].text;
                    }
                }

                if (j + 1 <= LearnDataRes.rows[0].COUNT) {

                    var dataArr = [
                        "N",
                        commonUtil.nvl(dataCod.entryNo),
                        commonUtil.nvl(dataCod.STATEMENTDIV),
                        commonUtil.nvl(dataCod.CONTRACTNUM),
                        commonUtil.nvl(dataCod.ogCompanyCode),
                        commonUtil.nvl(dataCod.CTOGCOMPANYNAMENM),
                        commonUtil.nvl(dataCod.brokerCode),
                        commonUtil.nvl(dataCod.brokerName),
                        commonUtil.nvl(dataCod.CTNM),
                        commonUtil.nvl(dataCod.insstdt),
                        commonUtil.nvl(dataCod.insenddt),
                        commonUtil.nvl(dataCod.UY),
                        commonUtil.nvl(dataCod.CURCD),
                        commonUtil.nvl2(dataCod.PAIDPERCENT, 0),
                        commonUtil.nvl2(dataCod.PAIDSHARE, 0),
                        commonUtil.nvl2(dataCod.OSLPERCENT, 0),
                        commonUtil.nvl2(dataCod.OSLSHARE, 0),
                        commonUtil.nvl2(dataCod.GROSSPM, 0),
                        commonUtil.nvl2(dataCod.PM, 0),
                        commonUtil.nvl2(dataCod.PMPFEND, 0),
                        commonUtil.nvl2(dataCod.PMPFWOS, 0),
                        commonUtil.nvl2(dataCod.XOLPM, 0),
                        commonUtil.nvl2(dataCod.RETURNPM, 0),
                        commonUtil.nvl2(dataCod.GROSSCN, 0),
                        commonUtil.nvl2(dataCod.CN, 0),
                        commonUtil.nvl2(dataCod.PROFITCN, 0),
                        commonUtil.nvl2(dataCod.BROKERAGE, 0),
                        commonUtil.nvl2(dataCod.TAX, 0),
                        commonUtil.nvl2(dataCod.OVERRIDINGCOM, 0),
                        commonUtil.nvl2(dataCod.CHARGE, 0),
                        commonUtil.nvl2(dataCod.PMRESERVERTD, 0),
                        commonUtil.nvl2(dataCod.PFPMRESERVERTD, 0),
                        commonUtil.nvl2(dataCod.PMRESERVERLD, 0),
                        commonUtil.nvl2(dataCod.PFPMRESERVERLD, 0),
                        commonUtil.nvl2(dataCod.CLAIM, 0),
                        commonUtil.nvl2(dataCod.LOSSRECOVERY, 0),
                        commonUtil.nvl2(dataCod.CASHLOSS, 0),
                        commonUtil.nvl2(dataCod.CASHLOSSRD, 0),
                        commonUtil.nvl2(dataCod.LOSSRR, 0),
                        commonUtil.nvl2(dataCod.LOSSRR2, 0),
                        commonUtil.nvl2(dataCod.LOSSPFEND, 0),
                        commonUtil.nvl2(dataCod.LOSSPFWOA, 0),
                        commonUtil.nvl2(dataCod.INTEREST, 0),
                        commonUtil.nvl2(dataCod.TAXON, 0),
                        commonUtil.nvl2(dataCod.MISCELLANEOUS, 0),
                        commonUtil.nvl2(dataCod.PMBL, 0),
                        commonUtil.nvl2(dataCod.CMBL, 0),
                        commonUtil.nvl2(dataCod.NTBL, 0),
                        commonUtil.nvl2(dataCod.cscosarfrncnnt2, 0)
                    ];

                    //update
                    console.log("update");
                    var andCond = "('" + fileInfos[0].imgId + "') and subnum = " + (parseInt(j) + 1);  
                    let updLearnDataRes = await conn.execute(queryConfig.batchLearningConfig.updateBatchLearningData + andCond, dataArr);
                } else {
                    //insert
                    var regId = req.session.userId;

                    var insArr = [
                        fileInfos[0].imgId,
                        commonUtil.nvl(dataCod.entryNo),
                        commonUtil.nvl(dataCod.STATEMENTDIV),
                        commonUtil.nvl(dataCod.CONTRACTNUM),
                        commonUtil.nvl(dataCod.ogCompanyCode),
                        commonUtil.nvl(dataCod.CTOGCOMPANYNAMENM),
                        commonUtil.nvl(dataCod.brokerCode),
                        commonUtil.nvl(dataCod.brokerName),
                        commonUtil.nvl(dataCod.CTNM),
                        commonUtil.nvl(dataCod.insstdt),
                        commonUtil.nvl(dataCod.insenddt),
                        commonUtil.nvl(dataCod.UY),
                        commonUtil.nvl(dataCod.CURCD),
                        commonUtil.nvl2(dataCod.PAIDPERCENT, 0),
                        commonUtil.nvl2(dataCod.PAIDSHARE, 0),
                        commonUtil.nvl2(dataCod.OSLPERCENT, 0),
                        commonUtil.nvl2(dataCod.OSLSHARE, 0),
                        commonUtil.nvl2(dataCod.GROSSPM, 0),
                        commonUtil.nvl2(dataCod.PM, 0),
                        commonUtil.nvl2(dataCod.PMPFEND, 0),
                        commonUtil.nvl2(dataCod.PMPFWOS, 0),
                        commonUtil.nvl2(dataCod.XOLPM, 0),
                        commonUtil.nvl2(dataCod.RETURNPM, 0),
                        commonUtil.nvl2(dataCod.GROSSCN, 0),
                        commonUtil.nvl2(dataCod.CN, 0),
                        commonUtil.nvl2(dataCod.PROFITCN, 0),
                        commonUtil.nvl2(dataCod.BROKERAGE, 0),
                        commonUtil.nvl2(dataCod.TAX, 0),
                        commonUtil.nvl2(dataCod.OVERRIDINGCOM, 0),
                        commonUtil.nvl2(dataCod.CHARGE, 0),
                        commonUtil.nvl2(dataCod.PMRESERVERTD, 0),
                        commonUtil.nvl2(dataCod.PFPMRESERVERTD, 0),
                        commonUtil.nvl2(dataCod.PMRESERVERLD, 0),
                        commonUtil.nvl2(dataCod.PFPMRESERVERLD, 0),
                        commonUtil.nvl2(dataCod.CLAIM, 0),
                        commonUtil.nvl2(dataCod.LOSSRECOVERY, 0),
                        commonUtil.nvl2(dataCod.CASHLOSS, 0),
                        commonUtil.nvl2(dataCod.CASHLOSSRD, 0),
                        commonUtil.nvl2(dataCod.LOSSRR, 0),
                        commonUtil.nvl2(dataCod.LOSSRR2, 0),
                        commonUtil.nvl2(dataCod.LOSSPFEND, 0),
                        commonUtil.nvl2(dataCod.LOSSPFWOA, 0),
                        commonUtil.nvl2(dataCod.INTEREST, 0),
                        commonUtil.nvl2(dataCod.TAXON, 0),
                        commonUtil.nvl2(dataCod.MISCELLANEOUS, 0),
                        commonUtil.nvl2(dataCod.PMBL, 0),
                        commonUtil.nvl2(dataCod.CMBL, 0),
                        commonUtil.nvl2(dataCod.NTBL, 0),
                        commonUtil.nvl2(dataCod.cscosarfrncnnt2, 0),
                        regId,
                        (parseInt(j) + 1)
                    ];

                    console.log("insert");
                    let insLearnDataRes = await conn.execute(queryConfig.batchLearningConfig.insertBatchLearningData, insArr);
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

var callbackUpdateBatchLearningData = function (rows, req, res) {
    console.log("UpdateBatchLearningData finish..");
    res.send({ code: 200, rows: rows });
};

// [POST] syncFile
async function isDirectory(f) {
    return (await mz.stat(f)).isDirectory();
}
async function readdir(filePath) {
    const files = await Promise.all((await mz.readdir(filePath)).map(async f => {
        const fullPath = path.join(filePath, f);
        return (await isDirectory(fullPath)) ? await readdir(fullPath) : fullPath;
    }));
    return flatten(files);
}
router.post('/syncFile', function (req, res) {
    const testFolder = propertiesConfig.filepath.imagePath;

    // files : 디렉토리에서 읽어온 파일들,  rows: TBL_BATCH_LEARN_DATA 파일들
    var fileProcess = function (files, rows, req, res) {
        console.log("files.... : " + files.length);
        console.log("rows.... : " + rows.length);
        let filePath = "";
        for (var i = 0; i < rows.length; i++) { // 현재 데이터에 존재하는 파일은 제거
            filePath = rows[i].FILEPATH;
            let _result = files.filter(function (_fileObj) {
                return _fileObj != filePath;
            });
            if (i == rows.length - 1) {
                if (files.length > 0) {
                    commonDB.syncBatchFiles(files, req, res);
                } else {
                    res.send({ code: 200, message: null, fileInfo: null });
                }
            }
        }
    };

    var callbackSelectFileNameList = function (rows, req, res) {
        console.log(rows);
        readdir(testFolder)
            .then(files => {
                //files.forEach(f => console.log(f));
                fileProcess(files, rows, req, res);
            })
            .catch(console.error);
    };

    commonDB.reqQueryParam(queryConfig.batchLearningConfig.selectFileNameList, [], callbackSelectFileNameList, req, res);
});

router.post('/compareBatchLearningData', function (req, res) {
    var dataObj = req.body.dataObj;
    var query = queryConfig.batchLearningConfig.selectContractMapping;
    var param;

    if (dataObj.CTOGCOMPANYNAMENM && dataObj.CTNM) {
        if (typeof dataObj.CTNM == 'string') { // 단일 계약명
            param = [dataObj.CTOGCOMPANYNAMENM, dataObj.CTNM];
        } else { // 다중 계약명
            param = [dataObj.CTOGCOMPANYNAMENM, dataObj.CTNM[0]];
            for (var i = 1; i < dataObj.CTNM.length; i++) {
                query += " OR (extOgCompanyName = '" + dataObj.CTOGCOMPANYNAMENM + "' AND extCtnm = '" + dataObj.CTNM[i] + "')";
            }
        }
        commonDB.reqQueryParam2(query, param, callbackSelectContractMapping, dataObj, req, res);
    } else {
        res.send({ isContractMapping: false });
    }
   
});

var callbackSelectContractMapping = function (rows, dataObj, req, res) {
    if (rows.length > 0) {

        dataObj.ASOGCOMPANYNAME = rows[0].ASOGCOMPANYNAME;
        dataObj.ASCTNM = rows[0].ASCTNM;
        dataObj.MAPPINGCTNM = rows[0].EXTCTNM;
        //var PM = commonUtil.nvl2(dataObj.PM == undefined ? 0:dataObj.PM.replace(",", "").replace(/(\s*)/g, "").trim(), 0);
        //var CN = commonUtil.nvl2(dataObj.CN == undefined ? 0 :dataObj.CN.replace(",", "").replace(/(\s*)/g, "").trim(), 0);
        if (dataObj.fileToPage.IMGID) {
            commonDB.reqQueryParam2(queryConfig.batchLearningConfig.compareBatchLearningData, [
                dataObj.fileToPage.IMGID
            ], callbackcompareBatchLearningData, dataObj, req, res);
        } else {
            res.send({ isContractMapping: false });
        }
    } else {
        res.send({ isContractMapping : false});
    }
}

var callbackcompareBatchLearningData = function (rows, dataObj, req, res) {
    console.log("compareBatchLearningData finish..");
    if (rows.length > 0) {
        rows[0].EXTOGCOMPANYNAME = dataObj.CTOGCOMPANYNAMENM;
        rows[0].EXTCTNM = dataObj.CTNM;
        rows[0].MAPPINGCTNM = dataObj.MAPPINGCTNM;
        res.send({ code: 200, rows: rows, isContractMapping: true });
    } else {
        res.send({ code: 500, message: 'answer Data not Found' });
    }
}

router.post('/uiTrainBatchLearningData', function (req, res) {
    var dataObj = req.body.dataObj;

    //console.log(dataObj);

    runTypoDomainTrain(dataObj, function (result1) {
        if (result1 == "true") {
            //text-classification train
            var exeTextString = 'python ' + appRoot + '\\ml\\cnn-text-classification\\train.py'
            exec(exeTextString, defaults, function (err, stdout, stderr) {
                console.log(stdout);
                //label-mapping train
                var exeLabelString = 'python ' + appRoot + '\\ml\\cnn-label-mapping\\train.py'
                exec(exeLabelString, defaults, function (err1, stdout1, stderr1) {
                    console.log(stdout1);
                    res.send("ui 학습 완료");
                });
            });

        } else {
            res.send("학습 실패");
        }
    });

});

var callbackSelectMultiBatchAnswerDataToFilePath = function (rows, req, res) {
    res.send(rows);
};
router.post('/selectMultiBatchAnswerDataToFilePath', function (req, res) {
    var queryIn = req.body.queryIn;

    commonDB.reqQuery(queryConfig.batchLearningConfig.selectMultiBatchAnswerDataToFilePath + queryIn, callbackSelectMultiBatchAnswerDataToFilePath, req, res);
});

async function runTypoDomainTrain(data, callbackTypoDomainTrain) {
    let res;
    try {
        res = await typoDomainTrain(data);
        console.log(res);
        callbackTypoDomainTrain(res);
    } catch (err) {
        console.error(err);
    }
}

function typoDomainTrain(data) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            for (var i = 0; i < data.length; i++) {
                if (data[i].transText != null) {
                    //console.log(data[i].originText);
                    var originSplit = data[i].text.split(" ");
                    var textSplit = data[i].transText.split(" ");

                    var textleng = Math.abs(data[i].text.length - data[i].transText.length);

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

                if (data[i].column == null) {
                    data[i].label = 'undefined';
                }

                var insTextClassifiCond = [];
                insTextClassifiCond.push(data[i].text);
                insTextClassifiCond.push(data[i].label);

                let insResult = await conn.execute(insertTextClassification, insTextClassifiCond);
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

async function runClassificationTrain(data, callbackClassificationTrain) {
    try {
        let res = await textClassificationTrain(data);
        console.log(res);
        callbackClassificationTrain(res);
    } catch (err) {
        console.error(err);
    }
}

function textClassificationTrain(data) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

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
            console.log("textClassification");
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

async function runMappingTrain(data, callbackLabelMappingTrain) {
    try {
        let res = await labelMappingTrain(data);
        console.log(res);
        callbackLabelMappingTrain(res);
    } catch (err) {
        console.error(err);
    }
}

function labelMappingTrain(data) {
    return new Promise(async function (resolve, reject) {
        let conn;

        try {
            conn = await oracledb.getConnection(dbConfig);

            for (var i in data) {
                if (data[i].textClassi == "fixlabel" || data[i].textClassi == "entryrowlabel") {
                    var insLabelMapCond = [];
                    insLabelMapCond.push(data[i].text);
                    insLabelMapCond.push(data[i].labelMapping);

                    let insLabelMapRes = await conn.execute(insertLabelMapping, insLabelMapCond);

                    console.log(insLabelMapRes);
                }
            }
            console.log("labelMapping");
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

router.post('/uiLearnTraining', function (req, res) {
    sync.fiber(function () {
        var filepath = req.body.imgIdArray;
        var uiData;
        for (var i = 0; i < filepath.length; i++) {
            //uiData = sync.await(batchLearnTraining(filepath[i], "LEARN_Y", sync.defer()));
            uiData = sync.await(uiLearnTraining(filepath[i], sync.defer()));

            res.send({ data: uiData });
        }       
    });
});

function uiLearnTraining(filepath, callback) {
    sync.fiber(function () {
        try {
            var imgid = sync.await(oracle.selectImgidUi(filepath, sync.defer()));
            imgid = imgid.rows[0].IMGID;

            var filename = filepath.substring(0, filepath.lastIndexOf("."));
            var fileExt = filepath.substring(filepath.lastIndexOf(".") + 1, filepath.length);

            var fullFilePath = "";
            var fullFilePathList = [];
            if (fileExt == "pdf") {
                var fileCount = 0;
                while (true) {
                    if (exists(filename + "-" + fileCount + ".png")) {
                        fullFilePathList.push(filename + "-" + fileCount + ".png");
                        fileCount++;
                    } else {
                        if (fileCount == 0) {
                            fullFilePathList.push(filename + ".png");
                        }
                        break;
                    }
                }

            } else if (fileExt == "png") {
                fullFilePath = filename + ".png";
            } else {
                fullFilePath = filename + ".jpg";
            }

            var retDataList = [];
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
                
                resPyArr = sync.await(transPatternVar.trans(resPyArr, sync.defer()));
                console.log(resPyArr);

                var retData = {};
                retData = resPyArr;
                retData.fileinfo = { filepath: fullFilePathList[i], imgId: imgid };
                sync.await(oracle.insertMLData(retData, sync.defer()));
                sync.await(oracle.updateBatchLearnListDocType(retData, sync.defer()));

                var labelData = sync.await(oracle.selectIcrLabelDef(retData.docCategory.DOCTOPTYPE, sync.defer()));

                retData.labelData = labelData.rows;

                retDataList.push(retData);
            }
            callback(null, retDataList);

        } catch (e) {
            console.log(e);
            callback(null, null);
        }


    });
}


router.post('/insertBatchLearnList', function (req, res) {

    sync.fiber(function () {
        sync.await(oracle.insertBatchLearnList(req.body, sync.defer()));
        res.send({ code: 200, msg: 'Success insert BatchLearnList' });
    });
});

router.post('/addBatchTraining', function (req, res) {
    req.setTimeout(500000);

    sync.fiber(function () {
        sync.await(oracle.insertBatchLearnList(req.body, sync.defer()));
        res.send({ code: 200, msg: 'Success AddTrain' });
    });
    /*
    sync.fiber(function () {
        var filepath = req.body.filePathArray;
        var retNum = 0;
        for (var i = 0; i < filepath.length; i++) {
            var batchData = sync.await(addBatchTraining(filepath[i], sync.defer()));
            retNum += batchData;
        }

        //ml training
        if (retNum > 0) {
            pythonConfig.columnMappingOptions.args = [];
            pythonConfig.columnMappingOptions.args = ["training"];
            var resCol = sync.await(PythonShell.run('eval3.py', pythonConfig.columnMappingOptions, sync.defer()));
            var resPyArr = JSON.parse(resCol[0].replace(/'/g, '"'));

            if (resPyArr["code"] != 200) {
                res.send({ code: 200, msg: resPyArr["message"] });
            } else {
                res.send({ code: 200, msg: 'Success AddTrain' });
            }
        } else {
            if (isNaN(retNum)) {
                res.send({ code: 200, msg: 'Fail AddTrain' });
            } else {
                res.send({ code: 200, msg: 'Success AddTrain' });
            }
        }
        
    });
    */
});

function addBatchTraining(filepath, done) {
    sync.fiber(function () {
        try {

            //get mlData, insert colData
            var resMlData = sync.await(oracle.addBatchTraining(filepath, sync.defer()));

            return done(null, resMlData);
        } catch (e) {
            console.log(e);
            return done(null, e);
        }
    });
}

router.post('/batchLearnTraining_old', function (req, res) {
    req.setTimeout(500000);

    sync.fiber(function () {
        var filepath = req.body.imgIdArray;
        var flag = req.body.flag;
        var retData = [];
        var uiTraining = '';
        for (var i = 0; i < filepath.length; i++) {
            var batchData = sync.await(batchLearnTraining(filepath[i], flag, sync.defer()));

            if (batchData.uiTraining && batchData.uiTraining == "uiTraining") {
                retData = [];
                retData.push(batchData);
                break;
            }

            retData.push(batchData);
        }

        res.send({ data: retData });
    });
});

router.post('/exportExcel', function (req, res) {
    sync.fiber(function () {
        var imgId = req.body.imgIdArray;
        var docTopType = req.body.docTopType;
        var workbook = new exceljs.Workbook();
        var worksheet = workbook.addWorksheet('My Sheet');

        if (docTopType == "2") {

            worksheet.mergeCells('A2:A4');
            worksheet.getCell('A4').value = "NO";
            worksheet.getCell('A4').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFDCDCDC'}
            };
            worksheet.mergeCells('B2:B4');
            worksheet.getCell('B4').value = "파일명";
            worksheet.getCell('B4').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFDCDCDC'}
            };
            worksheet.mergeCells('C2:C4');
            worksheet.getCell('C4').value = "KEY";
            worksheet.getCell('C4').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFDCDCDC'}
            };
            worksheet.mergeCells('D2:AC2');
            worksheet.getCell('D2').value = "본인부담";
            worksheet.getCell('D2').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FF9ACD32'}
            };
            worksheet.mergeCells('AD2:BC2');
            worksheet.getCell('AD2').value = "공단부담금";
            worksheet.getCell('AD2').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFB0C4DE'}
            };
            worksheet.mergeCells('BD2:CC2');
            worksheet.getCell('BD2').value = "전액본인부담";
            worksheet.getCell('BD2').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFD8BFD8'}
            };
            worksheet.mergeCells('CD2:DC2');
            worksheet.getCell('CD2').value = "선택진료료";
            worksheet.getCell('CD2').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFFFB6C1'}
            };
            worksheet.mergeCells('DD2:EC2');
            worksheet.getCell('DD2').value = "선택진료료이외";
            worksheet.getCell('DD2').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FF808000'}
            };
            worksheet.mergeCells('ED2:EF2');
            worksheet.getCell('ED2').value = "금액정보";
            worksheet.getCell('ED2').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFDCDCDC'}
            };
            worksheet.mergeCells('EG2:EI2');
            worksheet.getCell('EG2').value = "병원정보";
            worksheet.getCell('EG2').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFDCDCDC'}
            };
            worksheet.mergeCells('EJ2:EK2');
            worksheet.getCell('EJ2').value = "환자정보";
            worksheet.getCell('EJ2').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFDCDCDC'}
            };
            worksheet.mergeCells('EL2:EM2');
            worksheet.getCell('EL2').value = "치료정보";
            worksheet.getCell('EL2').fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'FFDCDCDC'}
            };

            
            worksheet.getCell("D3").value = "진찰료";
            worksheet.getCell("E3").value = "입원료(주1)";
            worksheet.getCell("F3").value = "식대";
            worksheet.getCell("G3").value = "투약및조제료(행위료)";
            worksheet.getCell("H3").value = "투약및조제료(약품비)";
            worksheet.getCell("I3").value = "주사료(행위료)";
            worksheet.getCell("J3").value = "주사료(약품비)";
            worksheet.getCell("K3").value = "마취료";
            worksheet.getCell("L3").value = "처치및수술료";
            worksheet.getCell("M3").value = "검사료";
            worksheet.getCell("N3").value = "영상진단";
            worksheet.getCell("O3").value = "방사선료";
            worksheet.getCell("P3").value = "치료재료대";
            worksheet.getCell("Q3").value = "재활및물리치료료";
            worksheet.getCell("R3").value = "정신요법료";
            worksheet.getCell("S3").value = "전혈/혈액성분제재";
            worksheet.getCell("T3").value = "CT진단료";
            worksheet.getCell("U3").value = "MRI진단료";
            worksheet.getCell("V3").value = "PET진단료";
            worksheet.getCell("W3").value = "초음파진단료";
            worksheet.getCell("X3").value = "보철교정료";
            worksheet.getCell("Y3").value = "기타진료비";
            worksheet.getCell("Z3").value = "65세이상(신설)";
            worksheet.getCell("AA3").value = "포괄수가진료비";
            worksheet.getCell("AB3").value = "표준항목외";
            worksheet.getCell("AC3").value = "합계";
            
            var cellList = ["D3", "E3", "F3", "G3", "H3", "I3", "J3", "K3", "L3", "M3", "N3", "O3", "P3", "Q3", "R3", "S3", "T3", "U3", 
                    "V3", "W3", "X3", "Y3", "Z3", "AA3", "AB3", "AC3"];
            var cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {
                
                if(cellList[i] == "AB3") {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FFFA8072"}
                    };
                    worksheet.getCell(cellList[i]).font = {
                        color: { argb: 'FFFF0000' }
                    };
                } else {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FF9ACD32"}
                    };
                }

            }
            
            
            worksheet.getCell("AD3").value = "진찰료";
            worksheet.getCell("AE3").value = "입원료(주1)";
            worksheet.getCell("AF3").value = "식대";
            worksheet.getCell("AG3").value = "투약및조제료(행위료)";
            worksheet.getCell("AH3").value = "투약및조제료(약품비)";
            worksheet.getCell("AI3").value = "주사료(행위료)";
            worksheet.getCell("AJ3").value = "주사료(약품비)";
            worksheet.getCell("AK3").value = "마취료";
            worksheet.getCell("AL3").value = "처치및수술료";
            worksheet.getCell("AM3").value = "검사료";
            worksheet.getCell("AN3").value = "영상진단";
            worksheet.getCell("AO3").value = "방사선료";
            worksheet.getCell("AP3").value = "치료재료대";
            worksheet.getCell("AQ3").value = "재활및물리치료료";
            worksheet.getCell("AR3").value = "정신요법료";
            worksheet.getCell("AS3").value = "전혈/혈액성분제재";
            worksheet.getCell("AT3").value = "CT진단료";
            worksheet.getCell("AU3").value = "MRI진단료";
            worksheet.getCell("AV3").value = "PET진단료";
            worksheet.getCell("AW3").value = "초음파진단료";
            worksheet.getCell("AX3").value = "보철교정료";
            worksheet.getCell("AY3").value = "기타진료비";
            worksheet.getCell("AZ3").value = "65세이상(신설)";
            worksheet.getCell("BA3").value = "포괄수가진료비";
            worksheet.getCell("BB3").value = "표준항목외";
            worksheet.getCell("BC3").value = "합계";
            
            cellList = ["AD3", "AE3", "AF3", "AG3", "AH3", "AI3", "AJ3", "AK3", "AL3", "AM3", "AN3", "AO3", "AP3", "AQ3", "AR3", "AS3", "AT3", "AU3", 
                    "AV3", "AW3", "AX3", "AY3", "AZ3", "BA3", "BB3", "BC3"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {
                
                if(cellList[i] == "BA3") {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FFFA8072"}
                    };
                    worksheet.getCell(cellList[i]).font = {
                        color: { argb: 'FFFF0000' }
                    };
                } else {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FFB0C4DE"}
                    };
                }

            }

            worksheet.getCell("BD3").value = "진찰료";
            worksheet.getCell("BE3").value = "입원료(주1)";
            worksheet.getCell("BF3").value = "식대";
            worksheet.getCell("BG3").value = "투약및조제료(행위료)";
            worksheet.getCell("BH3").value = "투약및조제료(약품비)";
            worksheet.getCell("BI3").value = "주사료(행위료)";
            worksheet.getCell("BJ3").value = "주사료(약품비)";
            worksheet.getCell("BK3").value = "마취료";
            worksheet.getCell("BL3").value = "처치및수술료";
            worksheet.getCell("BM3").value = "검사료";
            worksheet.getCell("BN3").value = "영상진단";
            worksheet.getCell("BO3").value = "방사선료";
            worksheet.getCell("BP3").value = "치료재료대";
            worksheet.getCell("BQ3").value = "재활및물리치료료";
            worksheet.getCell("BR3").value = "정신요법료";
            worksheet.getCell("BS3").value = "전혈/혈액성분제재";
            worksheet.getCell("BT3").value = "CT진단료";
            worksheet.getCell("BU3").value = "MRI진단료";
            worksheet.getCell("BV3").value = "PET진단료";
            worksheet.getCell("BW3").value = "초음파진단료";
            worksheet.getCell("BX3").value = "보철교정료";
            worksheet.getCell("BY3").value = "기타진료비";
            worksheet.getCell("BZ3").value = "65세이상(신설)";
            worksheet.getCell("CA3").value = "포괄수가진료비";
            worksheet.getCell("CB3").value = "표준항목외";
            worksheet.getCell("CC3").value = "합계";

            cellList = ["BD3", "BE3", "BF3", "BG3", "BH3", "BI3", "BJ3", "BK3", "BL3", "BM3", "BN3", "BO3", "BP3", "BQ3", "BR3", "BS3", "BT3", "BU3", 
                    "BV3", "BW3", "BX3", "BY3", "BZ3", "CA3", "CB3", "CC3"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {
                
                if(cellList[i] == "CA3") {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FFFA8072"}
                    };
                    worksheet.getCell(cellList[i]).font = {
                        color: { argb: 'FFFF0000' }
                    };
                } else {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FFD8BFD8"}
                    };
                }

            }

            worksheet.getCell("CD3").value = "진찰료";
            worksheet.getCell("CE3").value = "입원료(주1)";
            worksheet.getCell("CF3").value = "식대";
            worksheet.getCell("CG3").value = "투약및조제료(행위료)";
            worksheet.getCell("CH3").value = "투약및조제료(약품비)";
            worksheet.getCell("CI3").value = "주사료(행위료)";
            worksheet.getCell("CJ3").value = "주사료(약품비)";
            worksheet.getCell("CK3").value = "마취료";
            worksheet.getCell("CL3").value = "처치및수술료";
            worksheet.getCell("CM3").value = "검사료";
            worksheet.getCell("CN3").value = "영상진단";
            worksheet.getCell("CO3").value = "방사선료";
            worksheet.getCell("CP3").value = "치료재료대";
            worksheet.getCell("CQ3").value = "재활및물리치료료";
            worksheet.getCell("CR3").value = "정신요법료";
            worksheet.getCell("CS3").value = "전혈/혈액성분제재";
            worksheet.getCell("CT3").value = "CT진단료";
            worksheet.getCell("CU3").value = "MRI진단료";
            worksheet.getCell("CV3").value = "PET진단료";
            worksheet.getCell("CW3").value = "초음파진단료";
            worksheet.getCell("CX3").value = "보철교정료";
            worksheet.getCell("CY3").value = "기타진료비";
            worksheet.getCell("CZ3").value = "65세이상(신설)";
            worksheet.getCell("DA3").value = "포괄수가진료비";
            worksheet.getCell("DB3").value = "표준항목외";
            worksheet.getCell("DC3").value = "합계";

            cellList = ["CD3", "CE3", "CF3", "CG3", "CH3", "CI3", "CJ3", "CK3", "CL3", "CM3", "CN3", "CO3", "CP3", "CQ3", "CR3", "CS3", "CT3", "CU3", 
                    "CV3", "CW3", "CX3", "CY3", "CZ3", "DA3", "DB3", "DC3"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {
                
                if(cellList[i] == "DA3") {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FFFA8072"}
                    };
                    worksheet.getCell(cellList[i]).font = {
                        color: { argb: 'FFFF0000' }
                    };
                } else {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FFFFB6C1"}
                    };
                }

            }

            worksheet.getCell("DD3").value = "진찰료";
            worksheet.getCell("DE3").value = "입원료(주1)";
            worksheet.getCell("DF3").value = "식대";
            worksheet.getCell("DG3").value = "투약및조제료(행위료)";
            worksheet.getCell("DH3").value = "투약및조제료(약품비)";
            worksheet.getCell("DI3").value = "주사료(행위료)";
            worksheet.getCell("DJ3").value = "주사료(약품비)";
            worksheet.getCell("DK3").value = "마취료";
            worksheet.getCell("DL3").value = "처치및수술료";
            worksheet.getCell("DM3").value = "검사료";
            worksheet.getCell("DN3").value = "영상진단";
            worksheet.getCell("DO3").value = "방사선료";
            worksheet.getCell("DP3").value = "치료재료대";
            worksheet.getCell("DQ3").value = "재활및물리치료료";
            worksheet.getCell("DR3").value = "정신요법료";
            worksheet.getCell("DS3").value = "전혈/혈액성분제재";
            worksheet.getCell("DT3").value = "CT진단료";
            worksheet.getCell("DU3").value = "MRI진단료";
            worksheet.getCell("DV3").value = "PET진단료";
            worksheet.getCell("DW3").value = "초음파진단료";
            worksheet.getCell("DX3").value = "보철교정료";
            worksheet.getCell("DY3").value = "기타진료비";
            worksheet.getCell("DZ3").value = "65세이상(신설)";
            worksheet.getCell("EA3").value = "포괄수가진료비";
            worksheet.getCell("EB3").value = "표준항목외";
            worksheet.getCell("EC3").value = "합계";

            cellList = ["DD3", "DE3", "DF3", "DG3", "DH3", "DI3", "DJ3", "DK3", "DL3", "DM3", "DN3", "DO3", "DP3", "DQ3", "DR3", "DS3", "DT3", "DU3", 
                    "DV3", "DW3", "DX3", "DY3", "DZ3", "EA3", "EB3", "EC3"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {
                
                if(cellList[i] == "EA3") {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FFFA8072"}
                    };
                    worksheet.getCell(cellList[i]).font = {
                        color: { argb: 'FFFF0000' }
                    };
                } else {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FF808000"}
                    };
                }

            }

            worksheet.getCell("ED3").value = "이미납부한금액";
            worksheet.getCell("EE3").value = "납부한금액";
            worksheet.getCell("EF3").value = "진료비총액";
            worksheet.getCell("EG3").value = "요양기관종류";
            worksheet.getCell("EH3").value = "사업자등록번호";
            worksheet.getCell("EI3").value = "상호";
            worksheet.getCell("EJ3").value = "성명";
            worksheet.getCell("EK3").value = "환자구분";
            worksheet.getCell("EL3").value = "외래/입원";
            worksheet.getCell("EM3").value = "퇴원/중간";

            cellList = ["ED3", "EE3", "EF3", "EG3", "EH3", "EI3", "EJ3", "EK3", "EL3", "EM3"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {
                
                if(cellList[i] == "EF3") {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FFFA8072"}
                    };
                    worksheet.getCell(cellList[i]).font = {
                        color: { argb: 'FFFF0000' }
                    };
                } else {
                    worksheet.getCell(cellList[i]).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor:{argb: "FFDCDCDC"}
                    };
                }

            }

            worksheet.getCell("D4").value = "1";
            worksheet.getCell("E4").value = "2";
            worksheet.getCell("F4").value = "3";
            worksheet.getCell("G4").value = "4";
            worksheet.getCell("H4").value = "5";
            worksheet.getCell("I4").value = "6";
            worksheet.getCell("J4").value = "7";
            worksheet.getCell("K4").value = "8";
            worksheet.getCell("L4").value = "9";
            worksheet.getCell("M4").value = "10";
            worksheet.getCell("N4").value = "11";
            worksheet.getCell("O4").value = "12";
            worksheet.getCell("P4").value = "13";
            worksheet.getCell("Q4").value = "14";
            worksheet.getCell("R4").value = "15";
            worksheet.getCell("S4").value = "16";
            worksheet.getCell("T4").value = "17";
            worksheet.getCell("U4").value = "18";
            worksheet.getCell("V4").value = "19";
            worksheet.getCell("W4").value = "20";
            worksheet.getCell("X4").value = "21";
            worksheet.getCell("Y4").value = "22";
            worksheet.getCell("Z4").value = "23";
            worksheet.getCell("AA4").value = "24";
            worksheet.getCell("AB4").value = "25";
            worksheet.getCell("AC4").value = "26";

            cellList = ["D4", "E4", "F4", "G4", "H4", "I4", "J4", "K4", "L4", "M4", "N4", "O4", "P4", "Q4", "R4", "S4", "T4", "U4", "V4", "W4", "X4", "Y4", "Z4",
                    "AA4", "AB4", "AC4"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {                
                worksheet.getCell(cellList[i]).fill = {
                    type: 'pattern',
                    pattern:'solid',
                    fgColor:{argb: "FF9ACD32"}
                };               
            }

            worksheet.getCell("AD4").value = "27";
            worksheet.getCell("AE4").value = "28";
            worksheet.getCell("AF4").value = "29";
            worksheet.getCell("AG4").value = "30";
            worksheet.getCell("AH4").value = "31";
            worksheet.getCell("AI4").value = "32";
            worksheet.getCell("AJ4").value = "33";
            worksheet.getCell("AK4").value = "34";
            worksheet.getCell("AL4").value = "35";
            worksheet.getCell("AM4").value = "36";
            worksheet.getCell("AN4").value = "37";
            worksheet.getCell("AO4").value = "38";
            worksheet.getCell("AP4").value = "39";
            worksheet.getCell("AQ4").value = "40";
            worksheet.getCell("AR4").value = "41";
            worksheet.getCell("AS4").value = "42";
            worksheet.getCell("AT4").value = "43";
            worksheet.getCell("AU4").value = "44";
            worksheet.getCell("AV4").value = "45";
            worksheet.getCell("AW4").value = "46";
            worksheet.getCell("AX4").value = "47";
            worksheet.getCell("AY4").value = "48";
            worksheet.getCell("AZ4").value = "49";
            worksheet.getCell("BA4").value = "50";
            worksheet.getCell("BB4").value = "51";
            worksheet.getCell("BC4").value = "52";

            cellList = ["AD4", "AE4", "AF4", "AG4", "AH4", "AI4", "AJ4", "AK4", "AL4", "AM4", "AN4", "AO4", "AP4", "AQ4", "AR4", "AS4", "AT4", 
            "AU4", "AV4", "AW4", "AX4", "AY4", "AZ4", "BA4", "BB4", "BC4"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {                
                worksheet.getCell(cellList[i]).fill = {
                    type: 'pattern',
                    pattern:'solid',
                    fgColor:{argb: "FFB0C4DE"}
                };               
            }

            worksheet.getCell("BD4").value = "53";
            worksheet.getCell("BE4").value = "54";
            worksheet.getCell("BF4").value = "55";
            worksheet.getCell("BG4").value = "56";
            worksheet.getCell("BH4").value = "57";
            worksheet.getCell("BI4").value = "58";
            worksheet.getCell("BJ4").value = "59";
            worksheet.getCell("BK4").value = "60";
            worksheet.getCell("BL4").value = "61";
            worksheet.getCell("BM4").value = "62";
            worksheet.getCell("BN4").value = "63";
            worksheet.getCell("BO4").value = "64";
            worksheet.getCell("BP4").value = "65";
            worksheet.getCell("BQ4").value = "66";
            worksheet.getCell("BR4").value = "67";
            worksheet.getCell("BS4").value = "68";
            worksheet.getCell("BT4").value = "69";
            worksheet.getCell("BU4").value = "70";
            worksheet.getCell("BV4").value = "71";
            worksheet.getCell("BW4").value = "72";
            worksheet.getCell("BX4").value = "73";
            worksheet.getCell("BY4").value = "74";
            worksheet.getCell("BZ4").value = "75";
            worksheet.getCell("CA4").value = "76";
            worksheet.getCell("CB4").value = "77";
            worksheet.getCell("CC4").value = "78";

            cellList = ["BD4", "BE4", "BF4", "BG4", "BH4", "BI4", "BJ4", "BK4", "BL4", "BM4", "BN4", "BO4", "BP4", "BQ4", "BR4", "BS4", "BT4", 
            "BU4", "BV4", "BW4", "BX4", "BY4", "BZ4", "CA4", "CB4", "CC4"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {                
                worksheet.getCell(cellList[i]).fill = {
                    type: 'pattern',
                    pattern:'solid',
                    fgColor:{argb: "FFD8BFD8"}
                };               
            }

            worksheet.getCell("CD4").value = "79";
            worksheet.getCell("CE4").value = "80";
            worksheet.getCell("CF4").value = "81";
            worksheet.getCell("CG4").value = "82";
            worksheet.getCell("CH4").value = "83";
            worksheet.getCell("CI4").value = "84";
            worksheet.getCell("CJ4").value = "85";
            worksheet.getCell("CK4").value = "86";
            worksheet.getCell("CL4").value = "87";
            worksheet.getCell("CM4").value = "88";
            worksheet.getCell("CN4").value = "89";
            worksheet.getCell("CO4").value = "90";
            worksheet.getCell("CP4").value = "91";
            worksheet.getCell("CQ4").value = "92";
            worksheet.getCell("CR4").value = "93";
            worksheet.getCell("CS4").value = "94";
            worksheet.getCell("CT4").value = "95";
            worksheet.getCell("CU4").value = "96";
            worksheet.getCell("CV4").value = "97";
            worksheet.getCell("CW4").value = "98";
            worksheet.getCell("CX4").value = "99";
            worksheet.getCell("CY4").value = "100";
            worksheet.getCell("CZ4").value = "101";
            worksheet.getCell("DA4").value = "102";
            worksheet.getCell("DB4").value = "103";
            worksheet.getCell("DC4").value = "104";

            cellList = ["CD4", "CE4", "CF4", "CG4", "CH4", "CI4", "CJ4", "CK4", "CL4", "CM4", "CN4", "CO4", "CP4", "CQ4", "CR4", "CS4", "CT4", 
            "CU4", "CV4", "CW4", "CX4", "CY4", "CZ4", "DA4", "DB4", "DC4"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {                
                worksheet.getCell(cellList[i]).fill = {
                    type: 'pattern',
                    pattern:'solid',
                    fgColor:{argb: "FFFFB6C1"}
                };               
            }

            worksheet.getCell("DD4").value = "105";
            worksheet.getCell("DE4").value = "106";
            worksheet.getCell("DF4").value = "107";
            worksheet.getCell("DG4").value = "108";
            worksheet.getCell("DH4").value = "109";
            worksheet.getCell("DI4").value = "110";
            worksheet.getCell("DJ4").value = "111";
            worksheet.getCell("DK4").value = "112";
            worksheet.getCell("DL4").value = "113";
            worksheet.getCell("DM4").value = "114";
            worksheet.getCell("DN4").value = "115";
            worksheet.getCell("DO4").value = "116";
            worksheet.getCell("DP4").value = "117";
            worksheet.getCell("DQ4").value = "118";
            worksheet.getCell("DR4").value = "119";
            worksheet.getCell("DS4").value = "120";
            worksheet.getCell("DT4").value = "121";
            worksheet.getCell("DU4").value = "122";
            worksheet.getCell("DV4").value = "123";
            worksheet.getCell("DW4").value = "124";
            worksheet.getCell("DX4").value = "125";
            worksheet.getCell("DY4").value = "126";
            worksheet.getCell("DZ4").value = "127";
            worksheet.getCell("EA4").value = "128";
            worksheet.getCell("EB4").value = "129";
            worksheet.getCell("EC4").value = "130";

            cellList = ["DD4", "DE4", "DF4", "DG4", "DH4", "DI4", "DJ4", "DK4", "DL4", "DM4", "DN4", "DO4", "DP4", "DQ4", "DR4", "DS4", "DT4", 
            "DU4", "DV4", "DW4", "DX4", "DY4", "DZ4", "EA4", "EB4", "EC4"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {                
                worksheet.getCell(cellList[i]).fill = {
                    type: 'pattern',
                    pattern:'solid',
                    fgColor:{argb: "FF808000"}
                };               
            }

            worksheet.getCell("ED4").value = "131";
            worksheet.getCell("EE4").value = "132";
            worksheet.getCell("EF4").value = "133";
            worksheet.getCell("EG4").value = "134";
            worksheet.getCell("EH4").value = "135";
            worksheet.getCell("EI4").value = "136";
            worksheet.getCell("EJ4").value = "137";
            worksheet.getCell("EK4").value = "138";
            worksheet.getCell("EL4").value = "139";
            worksheet.getCell("EM4").value = "140";
            

            cellList = ["ED4", "EE4", "EF4", "EG4", "EH4", "EI4", "EJ4", "EK4", "EL4", "EM4"];
            cellListLength = cellList.length;                   
            for(var i = 0; i < cellListLength; i++) {                
                worksheet.getCell(cellList[i]).fill = {
                    type: 'pattern',
                    pattern:'solid',
                    fgColor:{argb: "FFDCDCDC"}
                };               
            }

            for (var i = 0; i < imgId.length; i++) {
                var result = sync.await(oracle.selectBatchLearnMlList([imgId[i]], sync.defer()));
                console.log(result);
                var excelObj = {};
                for (var j = 0; j < result.rows.length; j++) {
                    if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "1") {
                        excelObj.col1 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "2") {
                        excelObj.col2 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "3") {
                        excelObj.col3 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "4") {
                        excelObj.col4 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "5") {
                        excelObj.col5 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "6") {
                        excelObj.col6 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "7") {
                        excelObj.col7 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "8") {
                        excelObj.col8 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "9") {
                        excelObj.col9 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "10") {
                        excelObj.col10 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "11") {
                        excelObj.col11 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "12") {
                        excelObj.col12 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "13") {
                        excelObj.col13 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "14") {
                        excelObj.col14 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "15") {
                        excelObj.col15 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "16") {
                        excelObj.col16 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "17") {
                        excelObj.col17 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "18") {
                        excelObj.col18 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "19") {
                        excelObj.col19 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "20") {
                        excelObj.col20 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "21") {
                        excelObj.col21 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "22") {
                        excelObj.col22 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "23") {
                        excelObj.col23 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "24") {
                        excelObj.col24 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "25") {
                        excelObj.col25 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "26") {
                        excelObj.col26 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "27") {
                        excelObj.col27 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "28") {
                        excelObj.col28 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "29") {
                        excelObj.col29 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "30") {
                        excelObj.col30 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "31") {
                        excelObj.col31 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "32") {
                        excelObj.col32 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "33") {
                        excelObj.col33 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "34") {
                        excelObj.col34 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "35") {
                        excelObj.col35 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "36") {
                        excelObj.col36 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "37") {
                        excelObj.col37 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "38") {
                        excelObj.col38 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "39") {
                        excelObj.col39 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "40") {
                        excelObj.col40 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "41") {
                        excelObj.col41 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "42") {
                        excelObj.col42 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "43") {
                        excelObj.col43 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "44") {
                        excelObj.col44 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "45") {
                        excelObj.col45 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "46") {
                        excelObj.col46 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "47") {
                        excelObj.col47 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "48") {
                        excelObj.col48 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "49") {
                        excelObj.col49 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "50") {
                        excelObj.col50 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "51") {
                        excelObj.col51 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "52") {
                        excelObj.col52 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "53") {
                        excelObj.col53 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "54") {
                        excelObj.col54 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "55") {
                        excelObj.col55 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "56") {
                        excelObj.col56 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "57") {
                        excelObj.col57 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "58") {
                        excelObj.col58 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "59") {
                        excelObj.col59 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "60") {
                        excelObj.col60 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "61") {
                        excelObj.col61 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "62") {
                        excelObj.col62 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "63") {
                        excelObj.col63 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "64") {
                        excelObj.col64 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "65") {
                        excelObj.col65 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "66") {
                        excelObj.col66 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "67") {
                        excelObj.col67 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "68") {
                        excelObj.col68 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "69") {
                        excelObj.col69 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "70") {
                        excelObj.col70 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "71") {
                        excelObj.col71 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "72") {
                        excelObj.col72 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "73") {
                        excelObj.col73 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "74") {
                        excelObj.col74 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "75") {
                        excelObj.col75 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "76") {
                        excelObj.col76 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "77") {
                        excelObj.col77 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "78") {
                        excelObj.col78 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "79") {
                        excelObj.col79 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "80") {
                        excelObj.col80 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "81") {
                        excelObj.col81 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "82") {
                        excelObj.col82 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "83") {
                        excelObj.col83 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "84") {
                        excelObj.col84 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "85") {
                        excelObj.col85 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "86") {
                        excelObj.col86 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "87") {
                        excelObj.col87 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "88") {
                        excelObj.col88 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "89") {
                        excelObj.col89 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "90") {
                        excelObj.col90 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "91") {
                        excelObj.col91 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "92") {
                        excelObj.col92 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "93") {
                        excelObj.col93 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "94") {
                        excelObj.col94 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "95") {
                        excelObj.col95 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "96") {
                        excelObj.col96 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "97") {
                        excelObj.col97 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "98") {
                        excelObj.col98 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "99") {
                        excelObj.col99 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "100") {
                        excelObj.col100 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "101") {
                        excelObj.col101 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "102") {
                        excelObj.col102 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "103") {
                        excelObj.col103 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "104") {
                        excelObj.col104 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "105") {
                        excelObj.col105 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "106") {
                        excelObj.col106 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "107") {
                        excelObj.col107 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "108") {
                        excelObj.col108 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "109") {
                        excelObj.col109 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "110") {
                        excelObj.col110 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "111") {
                        excelObj.col111 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "112") {
                        excelObj.col112 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "113") {
                        excelObj.col113 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "114") {
                        excelObj.col114 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "115") {
                        excelObj.col115 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "116") {
                        excelObj.col116 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "117") {
                        excelObj.col117 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "118") {
                        excelObj.col118 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "119") {
                        excelObj.col119 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "120") {
                        excelObj.col120 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "121") {
                        excelObj.col121 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "122") {
                        excelObj.col122 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "123") {
                        excelObj.col123 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "124") {
                        excelObj.col124 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "125") {
                        excelObj.col125 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "126") {
                        excelObj.col126 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "0" && result.rows[j].ENTRYLABEL == "127") {
                        excelObj.col127 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "128") {
                        excelObj.col128 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "129") {
                        excelObj.col129 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "130") {
                        excelObj.col130 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "131") {
                        excelObj.col131 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "132") {
                        excelObj.col132 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "133") {
                        excelObj.col133 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "134") {
                        excelObj.col134 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "135") {
                        excelObj.col135 = result.rows[j].COLVALUE;
                    }
                }
                
                worksheet.addRow([
                    (i + 1), imgId[i].substr(imgId[i].lastIndexOf('/') + 1), '',
                    excelObj.col1, excelObj.col2, excelObj.col3, excelObj.col4, excelObj.col5,
                    excelObj.col6, excelObj.col7, excelObj.col8, excelObj.col9, excelObj.col10,
                    excelObj.col11, excelObj.col12, excelObj.col13, excelObj.col14, excelObj.col15,
                    excelObj.col16, excelObj.col17, excelObj.col18, excelObj.col19, excelObj.col20,
                    excelObj.col21, excelObj.col22, excelObj.col23, excelObj.col24, "", excelObj.col25, excelObj.col26,
                    excelObj.col27, excelObj.col28, excelObj.col29, excelObj.col30, excelObj.col31,
                    excelObj.col32, excelObj.col33, excelObj.col34, excelObj.col35, excelObj.col36,
                    excelObj.col37, excelObj.col38, excelObj.col39, excelObj.col40, excelObj.col41,
                    excelObj.col42, excelObj.col43, excelObj.col44, excelObj.col45, excelObj.col46,
                    excelObj.col47, "", excelObj.col48, excelObj.col49, excelObj.col50, excelObj.col51,
                    excelObj.col52, excelObj.col53, excelObj.col54, excelObj.col55, excelObj.col56,
                    excelObj.col57, excelObj.col58, excelObj.col59, excelObj.col60, excelObj.col61,
                    excelObj.col62, excelObj.col63, excelObj.col64, excelObj.col65, excelObj.col66,
                    excelObj.col67, excelObj.col68, excelObj.col69, excelObj.col70, excelObj.col71,
                    excelObj.col72, "", excelObj.col73, excelObj.col74, excelObj.col75, excelObj.col76,
                    excelObj.col77, excelObj.col78, excelObj.col79, excelObj.col80, excelObj.col81,
                    excelObj.col82, excelObj.col83, excelObj.col84, excelObj.col85, excelObj.col86,
                    excelObj.col87, excelObj.col88, excelObj.col89, excelObj.col90, excelObj.col91,
                    excelObj.col92, excelObj.col93, excelObj.col94, excelObj.col95, excelObj.col96,
                    excelObj.col97, "", excelObj.col98, excelObj.col99, excelObj.col100, excelObj.col101, 
                    excelObj.col102, excelObj.col103, excelObj.col104, excelObj.col105, excelObj.col106,
                    excelObj.col107, excelObj.col108, excelObj.col109, excelObj.col110, excelObj.col111,
                    excelObj.col112, excelObj.col113, excelObj.col114, excelObj.col115, excelObj.col116,
                    excelObj.col117, excelObj.col118, excelObj.col119, excelObj.col120, excelObj.col121,
                    excelObj.col122, "", excelObj.col123, excelObj.col124, excelObj.col125, excelObj.col126,
                    "", excelObj.col127, excelObj.col128, excelObj.col129, excelObj.col130, excelObj.col131,
                    excelObj.col132, excelObj.col133, excelObj.col134, excelObj.col135, excelObj.col136,
                    excelObj.col137, excelObj.col138, excelObj.col139, excelObj.col140
                ]);

            }

        } else if (docTopType == "37") {
            worksheet.columns = [
                { header: 'File', key: 'file' },
                { header: 'Buyer', key: 'Buyer' },
                { header: 'PO Number', key: 'PONumber' },
                { header: 'PO Date', key: 'PODate' },
                { header: 'Delivery Address', key: 'DeliveryAddress' },
                { header: 'Total Price', key: 'TotalPrice' },
                { header: 'Currency', key: 'Currency' },
                { header: 'Material', key: 'Material' },
                { header: 'EAN', key: 'EAN' },
                { header: 'Requested Delivery Date', key: 'RequestedDeliveryDate' },
                { header: 'Quantity', key: 'Quantity' },
                { header: 'Unit Price', key: 'UnitPrice' },
                { header: 'Item Total', key: 'ItemTotal' },
                { header: 'Serial Number', key: 'SerialNumber' },
            ];

            for (var i = 0; i < imgId.length; i++) {
                var filename = imgId[i].substring(imgId[i].lastIndexOf("/") + 1, imgId[i].length);

                var result = sync.await(oracle.selectPoMlExport(filename, sync.defer()));

                for (var j = 0; j < result.rows.length; j++) {
                    var data = result.rows[j].EXPORTDATA;
                    data = JSON.parse(data);
                    var excelObj = {};
                    excelObj.filename = filename;
                    for (var k = 0; k < data.length; k++) {
                        if (k == 0) {
                            excelObj.buyer = (data[k] != "null" ? data[k]:"");
                        } else if (k == 1) {
                            excelObj.poNumber = (data[k] != "null" ? data[k] : "");
                        } else if (k == 2) {
                            excelObj.poDate = (data[k] != "null" ? data[k] : "");
                        } else if (k == 3) {
                            excelObj.deliveryAddress = (data[k] != "null" ? data[k] : "");
                        } else if (k == 4) {
                            excelObj.totalPrice = (data[k] != "null" ? data[k] : "");
                        } else if (k == 5) {
                            excelObj.currency = (data[k] != "null" ? data[k] : "");
                        } else if (k == 6) {
                            excelObj.material = (data[k] != "null" ? data[k] : "");
                        } else if (k == 7) {
                            excelObj.ean = (data[k] != "null" ? data[k] : "");
                        } else if (k == 8) {
                            excelObj.requestDeliveryDate = (data[k] != "null" ? data[k] : "");
                        } else if (k == 9) {
                            excelObj.quantity = (data[k] != "null" ? data[k] : "");
                        } else if (k == 10) {
                            excelObj.unitPrice = (data[k] != "null" ? data[k] : "");
                        } else if (k == 11) {
                            excelObj.itemTotal = (data[k] != "null" ? data[k] : "");
                        } else if (k == 12) {
                            excelObj.serialNumber = (data[k] != "null" ? data[k] : "");
                        }
                    }
                    worksheet.addRow({
                        file: excelObj.filename, Buyer: excelObj.buyer, PONumber: excelObj.poNumber, PODate: excelObj.poDate,
                        DeliveryAddress: excelObj.deliveryAddress, TotalPrice: excelObj.totalPrice, Currency: excelObj.currency, Material: excelObj.material,
                        EAN: excelObj.ean, RequestedDeliveryDate: excelObj.requestDeliveryDate, Quantity: excelObj.quantity, UnitPrice: excelObj.unitPrice,
                        ItemTotal: excelObj.itemTotal, SerialNumber: excelObj.serialNumber
                    });
                }

            }

        } else {
            worksheet.columns = [
                { header: '파일명', key: 'fileName' },
                { header: '예측문서', key: 'docType' },
                { header: '출재사명', key: 'OGCOMPANYNAME' },
                { header: '계약명', key: 'CTNM' },
                { header: 'UY', key: 'UY' },
                { header: '화폐코드', key: 'CURCD' },
                { header: '화폐단위', key: 'CURUNIT' },
                { header: 'Paid(100%)', key: 'PAIDPERCENT' },
                { header: 'Paid(Our Share)', key: 'PAIDSHARE' },
                { header: 'OSL(100%)', key: 'OSLPERCENT' },
                { header: 'OSL(Our Share)', key: 'OSLSHARE' },
                { header: 'PREMIUM', key: 'PM' },
                { header: 'PREMIUM P/F ENT', key: 'PMPFEND' },
                { header: 'PREMIUM P/F WOS', key: 'PMPFWOS' },
                { header: 'XOL PREMIUM', key: 'XOLPM' },
                { header: 'RETURN PREMIUM', key: 'RETURNPM' },
                { header: 'COMMISSION', key: 'CN' },
                { header: 'PROFIT COMMISSION', key: 'PROFITCN' },
                { header: 'BROKERAGE', key: 'BROKERAGE' },
                { header: 'TAX', key: 'TAX' },
                { header: 'OVERRIDING COM', key: 'OVERRIDINGCOM' },
                { header: 'CHARGE', key: 'CHARGE' },
                { header: 'PREMIUM RESERVE RTD', key: 'PMRESERVERTD1' },
                { header: 'P/F PREMIUM RESERVE RTD', key: 'PFPMRESERVERTD1' },
                { header: 'PREMIUM RESERVE RLD', key: 'PMRESERVERTD2' },
                { header: 'P/F PREMIUM RESERVE RLD', key: 'PFPMRESERVERTD2' },
                { header: 'CLAIM', key: 'CLAIM' },
                { header: 'LOSS RECOVERY', key: 'LOSSRECOVERY' },
                { header: 'CASH LOSS', key: 'CASHLOSS' },
                { header: 'CASH LOSS REFUND', key: 'CASHLOSSRD' },
                { header: 'LOSS RESERVE RTD', key: 'LOSSRR' },
                { header: 'LOSS RESERVE RLD	', key: 'LOSSRR2' },
                { header: 'LOSS P/F ENT', key: 'LOSSPFENT' },
                { header: 'LOSS P/F WOA', key: 'LOSSPFWOA' },
                { header: 'INTEREST	', key: 'INTEREST' },
                { header: 'TAX ON', key: 'TAXON' },
                { header: 'MISCELLANEOUS', key: 'MISCELLANEOUS' },
                { header: 'Your Ref', key: 'CSCOSARFRNCNNT2' }
            ];

            for (var i = 0; i < imgId.length; i++) {
                var result = sync.await(oracle.selectBatchLearnMlList([imgId[i]], sync.defer()));
                console.log(result);
                var excelObj = {};
                for (var j = 0; j < result.rows.length; j++) {
                    if (result.rows[j].COLLABEL == "0") {
                        excelObj.OGCOMPANYNAME = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "1") {
                        excelObj.CTNM = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "2") {
                        excelObj.UY = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "4") {
                        excelObj.PM = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "5") {
                        excelObj.PMPFEND = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "6") {
                        excelObj.PMPFWOS = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "7") {
                        excelObj.XOLPM = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "8") {
                        excelObj.RETURNPM = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "9") {
                        excelObj.CN = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "10") {
                        excelObj.PROFITCN = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "11") {
                        excelObj.BROKERAGE = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "12") {
                        excelObj.TAX = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "13") {
                        excelObj.OVERRIDINGCOM = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "14") {
                        excelObj.CHARGE = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "15") {
                        excelObj.PMRESERVERTD1 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "16") {
                        excelObj.PFPMRESERVERTD1 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "17") {
                        excelObj.PMRESERVERTD2 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "18") {
                        excelObj.PFPMRESERVERTD2 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "19") {
                        excelObj.CLAIM = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "20") {
                        excelObj.LOSSRECOVERY = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "21") {
                        excelObj.CASHLOSS = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "22") {
                        excelObj.CASHLOSSRD = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "23") {
                        excelObj.LOSSRR = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "24") {
                        excelObj.LOSSRR2 = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "25") {
                        excelObj.LOSSPFENT = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "26") {
                        excelObj.LOSSPFWOA = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "27") {
                        excelObj.INTEREST = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "28") {
                        excelObj.TAXON = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "37" && result.rows[j].ENTRYLABEL == "29") {
                        excelObj.MISCELLANEOUS = result.rows[j].COLVALUE;
                    } else if (result.rows[j].COLLABEL == "35") {
                        excelObj.CSCOSARFRNCNNT2 = result.rows[j].COLVALUE;
                    }
                }

                worksheet.addRow({
                    fileName: imgId[i], docType: '', OGCOMPANYNAME: excelObj.OGCOMPANYNAME, CTNM: excelObj.CTNM,
                    UY: excelObj.UY, CURCD: excelObj.CURCD, CURUNIT: excelObj.CURUNIT, PAIDPERCENT: excelObj.PAIDPERCENT,
                    PAIDSHARE: excelObj.PAIDSHARE, OSLPERCENT: excelObj.OSLPERCENT, OSLSHARE: excelObj.OSLSHARE, PM: excelObj.PM,
                    PMPFEND: excelObj.PMPFEND, PMPFWOS: excelObj.PMPFWOS, XOLPM: excelObj.XOLPM, RETURNPM: excelObj.RETURNPM,
                    CN: excelObj.CN, PROFITCN: excelObj.PROFITCN, BROKERAGE: excelObj.BROKERAGE, TAX: excelObj.TAX,
                    OVERRIDINGCOM: excelObj.OVERRIDINGCOM, CHARGE: excelObj.CHARGE, PMRESERVERTD1: excelObj.PMRESERVERTD1, PFPMRESERVERTD1: excelObj.PFPMRESERVERTD1,
                    PMRESERVERTD2: excelObj.PMRESERVERTD2, PFPMRESERVERTD2: excelObj.PFPMRESERVERTD2, CLAIM: excelObj.CLAIM, LOSSRECOVERY: excelObj.LOSSRECOVERY,
                    CASHLOSS: excelObj.CASHLOSS, CASHLOSSRD: excelObj.CASHLOSSRD, LOSSRR: excelObj.LOSSRR, LOSSRR2: excelObj.LOSSRR2,
                    LOSSPFENT: excelObj.LOSSPFENT, LOSSPFWOA: excelObj.LOSSPFWOA, INTEREST: excelObj.INTEREST, TAXON: excelObj.TAXON,
                    MISCELLANEOUS: excelObj.MISCELLANEOUS, CSCOSARFRNCNNT2: excelObj.CSCOSARFRNCNNT2
                });

            }
        }

        workbook.xlsx.writeFile("ICR.xlsx").then(function () {
            // done
            console.log("success");
            res.send({ fileName: "ICR.xlsx" });
        });
    });
});

router.get('/downloadExcel', function (req, res) {
    res.download(appRoot + "\\ICR.xlsx");
});

router.post('/uiDocTopType', function (req, res) {
    sync.fiber(function () {
        var docTopType = req.body.docTopType;
        var docTopData = sync.await(oracle.selectIcrDocTopType(req, sync.defer()));
        var labelData = sync.await(oracle.selectIcrLabelDef(docTopType, sync.defer()));

        res.send({ docTopData: docTopData.rows, labelData: labelData.rows });
    });
});

router.post('/batchLearnTraining', function (req, res) {

    var filepath = req.body.imgIdArray;
    var flag = req.body.flag;
    var retData = [];
    var uiTraining = '';

    Step(
        function executeML() {
            var self = this;
            filepath.forEach(function (element) {
                batchLearnTraining(element, self.parallel());
            });
        },
        function finalize(err) {
            if (err) console.log(err);
            console.log('done');
            res.send({ data: retData });
        }
    );
    //var batchData = sync.await(batchLearnTraining(filepath, flag, sync.defer()));


});

function exists(path) {
    try {
        fs.accessSync(path);
    } catch (err) {
        return false;
    }
    return true;
}

function batchLearnTraining(filepath, callback) {
    sync.fiber(function () {
        try {
            var imgid = sync.await(oracle.selectImgid(filepath, sync.defer()));
            imgid = imgid.rows[0].IMGID;

            var filename = filepath.substring(0, filepath.lastIndexOf("."));
            var fileExt = filepath.substring(filepath.lastIndexOf(".") + 1, filepath.length);

            var fullFilePath = "";
            var fullFilePathList = [];
            if (fileExt == "pdf") {
                var fileCount = 0;
                while(true){
                    if (exists(filename + "-" + fileCount + ".png")) {
                        fullFilePathList.push(filename + "-" + fileCount + ".png");
                        fileCount++;
                    } else {
                        if (fileCount == 0) {
                            fullFilePathList.push(filename + ".png");
                        }
                        break;
                    }
                }
                
            } else if (fileExt == "png") {
                fullFilePath = filename + ".png";
            } else {
                fullFilePath = filename + ".jpg";
            }

            var retData = {};
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
                resPyArr = sync.await(transPatternVar.trans(resPyArr, sync.defer()));
                console.log(resPyArr);

                
                retData = resPyArr;
                retData.fileinfo = { filepath: fullFilePathList[i], imgId: imgid };
                sync.await(oracle.insertMLData(retData, sync.defer()));
                sync.await(oracle.updateBatchLearnListDocType(retData, sync.defer()));

                var colMappingList = sync.await(oracle.selectColumn(null, sync.defer()));
                var entryMappingList = sync.await(oracle.selectEntryMappingCls(null, sync.defer()));
                var labelData = sync.await(oracle.selectIcrLabelDef(null, sync.defer()));

                retData.column = colMappingList;
                retData.entryMappingList = entryMappingList;
                retData.labelData = labelData.rows;

            }
            sync.await(oracle.insertSamMLData(filepath, imgid, sync.defer()));
            sync.await(oracle.updateBatchLearnListStatus(imgid, sync.defer()));
            callback(null, retData);

        } catch (e) {
            console.log(e);
            callback(null, null);
        }


    });
}

function batchLearnTraining_old(filepath, flag, done) {
    sync.fiber(function () {
        try {

            var retData = {};
            var resLegacyData = sync.await(oracle.selectLegacyFilepath(filepath, sync.defer()));

            if (resLegacyData[0].rows.length < 0) {
                return done(null, "error getLegacy");
            }
           
            var ocrResult = sync.await(oracle.selectOcrData(propertiesConfig.filepath.answerFileFrontPath + filepath, sync.defer()));

            var filename = resLegacyData[0].rows[0].FILENAME;
            var imgId = resLegacyData[0].rows[0].IMGID;
            var convertFilpath = filepath;

            if (ocrResult.length == 0) {
                console.time("convertTiftoJpg");

                if (filename.split('.')[1].toLowerCase() === 'tif' || filename.split('.')[1].toLowerCase() === 'tiff') {
                    let result = sync.await(oracle.convertTiftoJpg(filepath, sync.defer()));

                    if (result == "error") {
                        return done(null, "error convertTiftoJpg");
                    }

                    if (result) {
                        convertFilpath = result;
                    }
                }
                console.timeEnd("convertTiftoJpg");

                //ocr
                console.time("ocr");
                ocrResult = sync.await(ocrUtil.localOcr(propertiesConfig.filepath.answerFileFrontPath + convertFilpath, sync.defer()));
                //ocrResult = sync.await(ocrUtil.proxyOcr(propertiesConfig.filepath.answerFileFrontPath + convertFilpath, sync.defer()));// 운영서버용

                if (ocrResult == "error") {
                    return done(null, "error ocr");
                }

                if (ocrResult != null) {
                    var insOcrData = sync.await(oracle.insertOcrData(propertiesConfig.filepath.answerFileFrontPath + filepath, JSON.stringify(ocrResult), sync.defer()));
                    //ocrResult = JSON.parse(ocrResult);
                    //ocrResult = ocrJson(ocrResult.regions);
                }

                console.timeEnd("ocr");
            } else {
                console.log("get DBOcr done")
            }
            //typo ML
            //20180904 hskim 개별학습의 typo ML 사용할 것 aimain function 호출
            console.time("columnMapping ML");
            pythonConfig.columnMappingOptions.args = [];
            pythonConfig.columnMappingOptions.args.push(propertiesConfig.filepath.answerFileFrontPath + filepath);
            pythonConfig.columnMappingOptions.args.push(flag);
            var resPyStr = sync.await(PythonShell.run('batchClassify.py', pythonConfig.columnMappingOptions, sync.defer()));            
            var resPyArr = JSON.parse(resPyStr[0]);

            console.timeEnd("columnMapping ML");
            retData = resPyArr;
            retData.fileinfo = { filepath: filepath, imgId: imgId };

            if (flag == "LEARN_Y") {
                console.time("ML Export");
                var resData = JSON.parse(resPyArr.data.replace(/'/g, '"'));
                retData.data = resData;
                sync.await(oracle.insertMLData(retData, sync.defer()));
                console.timeEnd("ML Export");

                var colMappingList = sync.await(oracle.selectColumn(null, sync.defer()));
                var entryMappingList = sync.await(oracle.selectEntryMappingCls(null, sync.defer()));

                retData.column = colMappingList;
                retData.entryMappingList = entryMappingList;
            }
            //20180910 ML 결과중 doctype을 화면에 표시

            //TBL_FORM_MAPPING 에 조회
            //조회 결과가 없으면 doctype 0 조회결과가 있으면 doctype 을 TBL_DOCUMENT_CATEGORY 테이블에 매핑 
            //결과 script 에 리턴

            // console.time("form mapping");
            // var resForm = sync.await(oracle.selectForm(sidData, sync.defer()));
            // console.timeEnd("form mapping");
            
            // // 2차 버전
            // // doc type이 2 이상인 경우 개별 학습의 columnMapping 처리 입력데이터중 sid 를 기존 (좌표,sid) 에서 (문서번호,좌표,sid) 로 변경
            // var sidDocData = convertSidWithDoc(sidData, resForm);

            // console.time("columnMapping ML");
            // pythonConfig.columnMappingOptions.args = [];
            // pythonConfig.columnMappingOptions.args.push(JSON.stringify(sidDocData));
            // resPyStr = sync.await(PythonShell.run('batchClassify.py', pythonConfig.columnMappingOptions, sync.defer()));
            // resPyArr = JSON.parse(resPyStr[0].replace(/'/g, '"'));
            // console.timeEnd("columnMapping ML");

            //retData.data = resPyArr;
            //retData.docCategory = resForm;


            // console.time("insert MlExport");
            // sync.await(oracle.insertMLData(retData, sync.defer()));
            // console.timeEnd("insert MlExport");

            return done(null, retData);
        } catch (e) {
            console.log(resPyStr);
            console.log(e);
            return done(null, e);
        }
    });
}

function ocrJson(regions) {
    var data = [];
    for (var i = 0; i < regions.length; i++) {
        for (var j = 0; j < regions[i].lines.length; j++) {
            var item = '';
            for (var k = 0; k < regions[i].lines[j].words.length; k++) {
                item += regions[i].lines[j].words[k].text + ' ';
            }
            //data.push({ 'location': regions[i].lines[j].boundingBox, 'text': item.trim() });
            data.push({ 'location': regions[i].lines[j].boundingBox, 'text': item.trim().replace(/'/g, '`') });
        }
    }
    return data;
}

function convertSidWithDoc(sidData, doc) {
    var doctype = doc.DOCTYPE;
    for (var i in sidData) {
        sidData[i].sid = doctype + "," + sidData[i].sid;
    }
    return sidData;
}

function batchLearnTraing2(imgId, uiCheck, done) {
    sync.fiber(function () {
        try {

            var retData = {};

            var originArr = [imgId];

            var originImageArr = sync.await(oracle.selectOcrFilePaths(originArr, sync.defer()));

            if (originImageArr == "error") {
                return done(null, "error selectOcrFilePaths");
            }

            originImageArr = [originImageArr[0]];
            imgId = originImageArr[0].IMGID;

            console.time("convertTiftoJpg");
            //tif to jpg
            for (var item in originImageArr) {
                if (originImageArr[item].FILENAME.split('.')[1].toLowerCase() === 'tif' || originImageArr[item].FILENAME.split('.')[1].toLowerCase() === 'tiff') {
                    let result = sync.await(oracle.convertTiftoJpg(originImageArr[item].FILEPATH, sync.defer()));
                    if (result) {
                        originImageArr[item]['ORIGINFILEPATH'] = originImageArr[item]['FILEPATH'];
                        originImageArr[item]['FILEPATH'] = result;
                    }

                    if (result == "error") {
                        return done(null, "error convertTiftoJpg");
                    }
                }
            }
            console.timeEnd("convertTiftoJpg");

            //ocr
            console.time("ocr");
            var ocrResult = sync.await(oracle.callApiOcr(originImageArr, sync.defer()));
            //var ocrResult = sync.await(ocrUtil.proxyOcr(originImageArr.CONVERTEDIMGPATH, sync.defer())); -- 운영서버용

            if (ocrResult == "error") {
                return done(null, "error ocr");
            }

            console.timeEnd("ocr");

            //typo ML
            console.time("typo ML");
            pythonConfig.typoOptions.args = [];
            pythonConfig.typoOptions.args.push(JSON.stringify(dataToTypoArgs(ocrResult)));
            var resPyStr = sync.await(PythonShell.run('typo2.py', pythonConfig.typoOptions, sync.defer()));
            var resPyArr = JSON.parse(resPyStr[0].replace(/'/g, '"'));
            var sidData = sync.await(oracle.select(resPyArr, sync.defer()));
            console.timeEnd("typo ML");


            //form label mapping DL
            console.time("formLabelMapping ML");
            pythonConfig.formLabelMappingOptions.args = [];
            pythonConfig.formLabelMappingOptions.args.push(JSON.stringify(sidData));
            console.log(JSON.stringify(sidData));
            resPyStr = sync.await(PythonShell.run('eval2.py', pythonConfig.formLabelMappingOptions, sync.defer()));
            resPyArr = JSON.parse(resPyStr[0].replace(/'/g, '"'));
            console.timeEnd("formLabelMapping ML");

            //form mapping DL
            console.time("formMapping ML");
            pythonConfig.formMappingOptions.args = [];
            pythonConfig.formMappingOptions.args.push(JSON.stringify(resPyArr));
            resPyStr = sync.await(PythonShell.run('eval2.py', pythonConfig.formMappingOptions, sync.defer()));
            resPyArr = JSON.parse(resPyStr[0].replace(/'/g, '"'));
            var docData = sync.await(oracle.selectDocCategory(resPyArr, sync.defer()));
            console.timeEnd("formMapping ML");

            //column mapping DL
            console.time("columnMapping ML");
            pythonConfig.columnMappingOptions.args = [];
            pythonConfig.columnMappingOptions.args.push(JSON.stringify(docData.data));
            resPyStr = sync.await(PythonShell.run('eval2.py', pythonConfig.columnMappingOptions, sync.defer()));
            resPyArr = JSON.parse(resPyStr[0].replace(/'/g, '"'));
            

            var mlData = {};
            mlData["mlData"] = resPyArr;
            if (docData.docCategory) {
                mlData["docCategory"] = docData.docCategory[0];
            }
            mlData["imgId"] = imgId;

            retData["mlexport"] = mlData;

            console.timeEnd("columnMapping ML");

            //select legacy data
            console.time("get legacy");
            var cobineRegacyData = sync.await(oracle.selectLegacyData(imgId, sync.defer()));

            retData["regacy"] = cobineRegacyData;

            //insert legacy data to batchLearnData
            var resRegacyData = sync.await(oracle.insertRegacyData(cobineRegacyData, sync.defer()));
            console.timeEnd("get legacy");


            //insert MLexport data to batchMlExport
            console.time("insert MLExport");
            var resMLData = sync.await(oracle.insertMLData(mlData, sync.defer()));
            console.timeEnd("insert MLExport");

            if (uiCheck == true) {
                var compareML = getAnswerCheck(cobineRegacyData, mlData["mlData"]);

                retData["uiTraining"] = "uiTraining";

                if (compareML == false) {

                    var columnArr = sync.await(oracle.selectColumn(null, sync.defer()));
                    retData["columnArr"] = columnArr;
                    retData["fileInfo"] = originImageArr;

                    return done(null, retData);
                }
            }

            console.log("done");

            return done(null, retData);
        } catch (e) {
            console.log(e);
            return done(null, "error");
        }
    });
}

function dataToTypoArgs(data) {

    for (var i in data) {
        data[i].text = data[i].text.toLowerCase().replace(/'/g, '`');
    }
    return data;
}

function getAnswerCheck(lagacy, ml) {
    var ogcomnm = [];
    var ctnm = [];
    var mlCheck = Array.apply(null, new Array(38)).map(Number.prototype.valueOf, 0);
    var ogcomnCheck = 0;
    var ctnmCheck = 0;
    var numCheck = lagacy.length + 1;

    for (var i = 0; i < lagacy.length; i++) {
        ogcomnm.push(lagacy[i].OGCOMPANYNAME);
        ctnm.push(lagacy[i].CTNM);
    }

    for (var i = 0; i < ml.length; i++) {
        var colLbl = ml[i].colLbl;

        if (ml[i].colLbl == "0") {
            if (ogcomnm.indexOf(ml[i].text) > -1) {
                mlCheck[colLbl] += 1;
            }
        }
        if (ml[i].colLbl == "1") {
            if (ctnm.indexOf(ml[i].text) > -1) {
                mlCheck[colLbl] += 1;
            }
        }
        if (ml[i].colLbl == "5") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "6") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "7") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "8") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "9") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "10") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "11") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "12") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "13") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "14") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "15") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "16") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "17") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "18") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "19") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "20") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "21") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "22") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "23") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "24") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "25") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "26") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "27") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "28") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "29") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "30") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "31") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "32") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "33") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "34") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "35") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "36") {
            mlCheck[colLbl] += 1;
        }
        if (ml[i].colLbl == "37") {
            mlCheck[colLbl] += 1;
        }

    }

    for (var i = 0; i < mlCheck.length; i++) {
        if (mlCheck.length != 36 && mlCheck[i] != numCheck) {
            return false;
        }
    }

    return true;

}


router.post('/selectBatchAnswerData', function (req, res) {
    sync.fiber(function () {
        var imgId = req.body.data.fileInfo[0].imgId;

        //select legacy data
        var cobineRegacyData = sync.await(oracle.selectLegacyData(imgId, sync.defer()));

        res.send({ data: cobineRegacyData });
    });
});





















/***************************************************************
 * (legacy)
 * *************************************************************/
router.get('/pyTest', function (req, res) {

    const defaults = {
        encoding: 'utf8',
    };

    var arg = '"Partner of Choice"' + ' ' + '"Class of Business"' + ' ';
    var exeString = 'python ' + appRoot + '\\ml\\cnn-text-classification\\eval.py ' + arg;
    //var exeString = 'python ' + appRoot + '\\ml\\cnn-label-mapping\\eval.py ' + arg;
    //var exeString = 'python ' + appRoot + '\\ml\\cnn-text-classification\\train.py';
    exec(exeString, defaults, function (err, stdout, stderr) {
        //console.log(stdout);
        //console.log(stderr);
        res.send(stdout);
    });

});

router.get('/fixvalueTest', function (req, res) {
    var test = 'test';
    var excelArray = [];

    var workbook = new exceljs.Workbook();
    workbook.xlsx.readFile('E:\\projectworks\\koreanre\\docsample.xlsx')
        .then(function () {
            var worksheet = workbook.getWorksheet('Sheet1');
            worksheet.eachRow({ includeEmpty: true }, function (row, rowNumber) {

                var data = {};
                data.cell1 = row.values[1];
                data.cell2 = row.values[2];
                data.cell3 = row.values[3];
                data.cell4 = row.values[4];
                data.cell5 = "";

                excelArray.push(data);
                /*
                                if (row.values[4] == 'fixvalue') {
                                    console.log("Row " + rowNumber + " = " + row.values[1] + "," + row.values[2] + "," + row.values[3] + "," + row.values[4]);
                                }
                */
            });

            for (var i = 0; i < excelArray.length; i++) {
                if (excelArray[i].cell4 == "fixvalue") {

                    var valueXNum = excelArray[i].cell1;
                    var valueYNum = excelArray[i].cell2;
                    var minDis = 100000;
                    var fixlabel;

                    for (var j = 0; j < excelArray.length; j++) {
                        if (excelArray[j].cell4 == "fixlabel") {
                            var xNum = excelArray[j].cell1;
                            var yNum = excelArray[j].cell2;
                            var diffX = valueXNum - xNum;
                            var diffY = valueYNum - yNum;

                            var dis = Math.sqrt(Math.abs(diffX * diffX) + Math.abs(diffY * diffY));

                            if (minDis > dis) {
                                minDis = dis;
                                fixlabel = excelArray[j].cell3;
                            }
                        }
                    }

                    excelArray[i].cell5 = fixlabel;
                    //console.log(excelArray[i]);
                }
            }
        });

    res.send(test);
});

// fileupload
router.post('/multiUpload', upload.any(), function (req, res) {
    var files = req.files;
    var endCount = 0;
    var returnObj = [];

    for (var i = 0; i < files.length; i++) {
        if (files[i].originalname.split('.')[1] === 'TIF' || files[i].originalname.split('.')[1] === 'tif' ||
            files[i].originalname.split('.')[1] === 'TIFF' || files[i].originalname.split('.')[1] === 'tiff') {
            var ifile = appRoot + '\\' + files[i].path;
            var ofile = appRoot + '\\' + files[i].path.split('.')[0] + '.jpg';
            returnObj.push(files[i].originalname.split('.')[0] + '.jpg');
            exec('module\\imageMagick\\convert.exe -density 800x800 ' + ifile + ' ' + ofile, function (err, out, code) {                
                if (endCount === files.length - 1) { // 모든 파일 변환이 완료되면
                    res.send({ code: 200, message: returnObj });
                }
                endCount++;
            });
        }
    }
    console.log(":::::::::::retrunObj : " + JSON.stringify(returnObj));
});



//오늘날짜 변환함수
function getConvertDate() {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = (today.getMonth() + 1 < 10) ? '0' + (today.getMonth() + 1) : today.getMonth() + 1;
    var dd = today.getDate();
    var hh = (today.getHours() < 10) ? '0' + today.getHours() : today.getHours();
    var minute = (today.getMinutes() < 10) ? '0' + today.getMinutes() : today.getMinutes();
    var ss = (today.getSeconds() < 10) ? '0' + today.getSeconds() : today.getSeconds();
    var mss = (today.getMilliseconds() < 100) ? ((today.getMilliseconds() < 10) ? '00' + today.getMilliseconds() : '0' + today.getMilliseconds()) : today.getMilliseconds();

    return '' + yyyy + mm + dd + hh + minute + ss + mss;
}

router.get('/mlEvalTest', function (req, res) {

    var dataArray = [];
    dataArray = testDataPrepare();

    typoSentenceEval(dataArray, function(result1) {

        domainDictionaryEval(result1, function (result2) {
            
            textClassificationEval(result2, function (result3) {
                
                labelMappingEval(result3, function (result4) {
                    //console.log(result4);
                    res.send("test");
                })
            })
        })
    });
});

router.get('/fileTest', function (req, res) {
    const testFolder = 'E:\\projectworks\\koreanre\\sinokor-ocr\\uploads\\';

    const files = FileHound.create()
        .paths(testFolder)
        .ext('jpg','tif')
        .find();

    files.then(function (res) {
        //console.log(res);
    });

    res.send("test");
});

function testDataPrepare() {
    var array = [];

    var obj = {};
    obj.location = "1018,240,411,87";
    obj.text = "APEX";
    obj.label = "undefined";

    array.push(obj);

    var obj = {};
    obj.location = "1019,338,409,23";
    obj.text = "Partner of Choice";
    obj.label = "undefined";

    array.push(obj);

    var obj = {};
    obj.location = "1562,509,178,25";
    obj.text = "Voucher No";
    obj.label = "undefined";

    array.push(obj);

    var obj = {};
    obj.location = "206,848,111,24";
    obj.text = "Cedant";
    obj.label = "fixlabel";
    obj.column = "거래사명";

    array.push(obj);

    var obj = {};
    obj.location = "206,908,285,24";
    obj.text = "Class of Business";
    obj.label = "fixlabel";
    obj.column = "계약명";

    array.push(obj);

    var obj = {};
    obj.location = "574,847,492,32";
    obj.text = ": Solidarity- First Insurance 2018";
    obj.label = "fixvalue";
    obj.column = "거래사명 값";

    array.push(obj);

    var obj = {};
    obj.location = "574,907,568,32";
    obj.text = ": Marine Cargo Surplus 2018 - Inward";
    obj.label = "fixvalue";
    obj.column = "계약명 값";

    array.push(obj);

    return array;
}

//---------------------------- train test 영역 --------------------------------------------//

//http://localhost:3000/batchLearning/trainTest
router.get('/trainTest', function (req, res) {
    var data = trainPrepare();
    var inputData = inputPrepare();

    //typoSentenceTrain(data);
    domainDictionaryTrain(": Marine Cargo Surplus 2018 - Inward", "Cargo Q/S & S/P Inward");
    
    res.send("test");
});

function trainPrepare() { // jhy용 test
    var array = [];

    var obj = {};
    obj.location = "1019,338,409,23";
    obj.text = ": Marine Cargo Surplus 2018 - Inward 1 2";

    array.push(obj);

    return array;
}
function inputPrepare() { // jhy용 test
    var array = [];

    var obj = {};
    obj.location = "1019,338,409,23";
    obj.text = "Cargo Q/S & S/P Inward adfe";

    array.push(obj);

    return array;
}

/**
 * 
 * @param {any} data -> ml 완료한 데이터
 * @return boolean -> true : 정상 완료 , false : error
 */
function typoSentenceTrain(data) {
    var wordCount = 0; // 단어 총 개수
    var trainCount = 0; // train한 횟수
    var query = queryConfig.batchLearningConfig.selectIsExistWordToSymspell;

    for (var i in data) {
        var line = data[i].text.split(' ');
        wordCount += line.length;
        for (var j in line) {
            try {
                commonDB.queryParam(query, [line[j].toLowerCase()], function (rows, origin) {
                    if (rows.length > 0) { // 단어가 테이블에 존재하면
                        query = queryConfig.batchLearningConfig.updataSymsepll;
                    } else { // 단어가 테이블에 존재하지 않으면
                        query = queryConfig.batchLearningConfig.insertSymspell;
                    }
                    commonDB.queryNoRows(query, [origin], function () {
                        trainCount++;
                        if (trainCount == queryCount) { // train 완료되면
                            return true;
                        }
                    });
                }, line[j].toLowerCase());
            } catch (e) {
                console.log(e);
                return false;
            }
        }
    }
}


function domainDictionaryTrain(mlData, inputData) {
    var originSplit = mlData.split(" ");
    var textSplit = inputData.split(" ");

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

                //const insDomainDicRes = connection.query(insertDomainDic, insDicCond);
                commonDB.queryNoRows(insertDomainDic, insDicCond, function () {});

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

                //const insDomainDicRes = connection.query(insertDomainDic, insDicCond);
                commonDB.queryNoRows(insertDomainDic, insDicCond, function () { });

            } else {
                os++;
                osNext = os;
                break;
            }
        }

    }
}

router.get("/textTrainTest", function (req, res) {
    var dataArray = [];
    dataArray = testDataPrepare();

    textClassificationTrain(dataArray, req, res);
});


function textClassificationTrain(data, req, res) {
    //text-classification DB insert
    for (var i in data) {
        var selectLabelCond = [];
        selectLabelCond.push(data[i].column);
        commonDB.queryParam(selectLabel, selectLabelCond, callbackSelectLabel, data[i]);
    }

    /*
    var exeTextString = 'python ' + appRoot + '\\ml\\cnn-text-classification\\train.py'
    exec(exeTextString, defaults, function (err, stdout, stderr) {
        console.log("textTrain");
    });
    */
}

function callbackSelectLabel(rows, data) {
    if (rows.length == 0) {
        data.textClassi = 'undefined';
    } else {
        data.textClassi = rows[0].LABEL;
        data.labelMapping = rows[0].ENKEYWORD;
    }

    var insTextClassifiCond = [];
    insTextClassifiCond.push(data.text);
    insTextClassifiCond.push(data.textClassi);

    commonDB.queryParam(insertTextClassification, insTextClassifiCond, function () { }, data);
}

function labelMappingTrain(data, req, res) {
    //label-mapping DB insert
    for (var i in data) {
        if (data[i].textClassi == "fixlabel" || data[i].textClassi == "entryrowlabel") {
            var insLabelMapCond = [];
            insLabelMapCond.push(data[i].text);
            insLabelMapCond.push(data[i].labelMapping);

            commonDB.queryParam(insertLabelMapping, insLabelMapCond, callbackInsLabelMap, data[i]);
        }
    }

    //label-mapping train
    /*
    var exeLabelString = 'python ' + appRoot + '\\ml\\cnn-label-mapping\\train.py'
    exec(exeLabelString, defaults, function (err1, stdout1, stderr1) {
        console.log("labelTrain");
    });
    */
}

function callbackInsLabelMap(rows, data) {

}

//---------------------------- // train test 영역 --------------------------------------------//

/*
// 신규문서 양식 등록
var callbackSelectDocCategory = function (rows, req, res) {
    if (rows.length > 0) {
        res.send({ code: 200, docCategory: rows, message: 'document Category insert success' });
    } else {
        res.send({ code: 500, message: 'document Category select error' });
    }
};
var callbackInsertDocCategory = function (rows, docType, req, res) {

    //commonDB.reqQueryParam(queryConfig.mlConfig.selectDocCategory, [docType], callbackSelectDocCategory, req, res);
    res.send({ code: 200, message: 'new document insert success' });
};
var callbackSelectMaxDocType = function (rows, req, res) {
    var docName = req.body.docName;
    var sampleImagePath = req.body.sampleImagePath;
    var docType = parseInt(rows[0].DOCTYPE);

    commonDB.reqQueryParam2(queryConfig.batchLearningConfig.insertDocCategory, [docName, (docType + 1), sampleImagePath], callbackInsertDocCategory, (docType + 1), req, res);
};
*/
router.post('/insertDocCategory', function (req, res) {
    //commonDB.reqQuery(queryConfig.batchLearningConfig.selectMaxDocType, callbackSelectMaxDocType, req, res);
    var docName = req.body.docName;
    var sampleImagePath = req.body.sampleImagePath;
    var returnObj;

    sync.fiber(function () {
        try {
            var result = sync.await(oracle.insertNewDocument([docName, sampleImagePath],sync.defer()));
			var params = {
                filePathArray: [sampleImagePath],
                docNameArr: [docName]
            };
            sync.await(oracle.insertBatchLearnList(params, sync.defer()));
            
            if (result.code == 200) {
                returnObj = { code: 200, message: 'new document insert success' };
            } else {
                returnObj = { code: 500, message: result.error };
            }
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});
// end 신규문서 양식 등록 

router.post('/selectLikeDocCategory', function (req, res) {
    var keyword = '%' + req.body.keyword + '%';
    var returnObj;

    sync.fiber(function () {
        try {
            var result = sync.await(oracle.selectDocumentCategory(keyword, sync.defer()));
            if (result.rows) {
                returnObj = { data : result.rows };
            } else {
                returnObj = { data: null };
            }
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});

// tif 파일 없는거 tbl_batch_learn_list 테이블에서 status = 'R' update
router.post('/deleteBatchLearnList', function (req, res) {
    var filepath = req.body.filepath;
    var data = [req.body.imgId];
    var returnObj;

    sync.fiber(function () {
        try {
            var result = sync.await(oracle.deleteBatchLearnList(data, sync.defer()));
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});

// 분류제외문장조회
router.post('/selectClassificationSt', function (req, res) {
    var returnObj;
    var filepath = req.body.filepath;
    var data = [];
    data.push(req.body.filepath);

    sync.fiber(function () {
        try {
            var result = sync.await(oracle.selectClassificationSt(data, sync.defer()));
            if (result.rows) {
                returnObj = { data: result.rows };
            } else {
                returnObj = { data: null };
            }
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});


// 문서양식매핑
router.post('/insertDoctypeMapping', function (req, res) {
    var returnObj;

    var data = {
        imgId: req.body.imgId,
        filepath: req.body.filepath,
        docName: req.body.docName,
        radioType: req.body.radioType,
        textList: req.body.textList
    }

    sync.fiber(function () {
        try {
            let data = req.body;
            returnObj = sync.await(batch.insertDoctypeMapping(data, sync.defer()));
           
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});

// 파일업로드시 TBL_BATCH_LEARN_LIST 에 파일정보 INSERT
router.post('/insertBatchLearningFileInfoTest', function (req, res) {
    var returnObj;

    var data = {
        imgId: req.body.fileInfo.imgId,
        filepath: req.body.fileInfo.filePath,
        docTopType: req.body.docTopType
    }

    sync.fiber(function () {
        try {
            returnObj = sync.await(oracle.insertBatchLearningFileInfoTest(data, sync.defer()));
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});

router.post('/selectIcrLabelDef', function (req, res) {
    var returnObj;
    var data = req.body.docType;
    if (data) {
        data = data;
    } else {
        data = "2";
    }
    sync.fiber(function () {
        try {
            returnObj = sync.await(oracle.selectIcrLabelDefTest(data, sync.defer()));
        } catch (e) {
            console.log(e);
            returnObj = { code: 500, message: e };
        } finally {
            res.send(returnObj);
        }
    });
});

Date.prototype.isoNum = function (n) {
    var tzoffset = this.getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(this - tzoffset)).toISOString().slice(0, -1);
    return localISOTime.replace(/[-T:\.Z]/g, '').substring(0, n || 20); // YYYYMMDD
};


module.exports = router;