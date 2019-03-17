'use strict';

// var express = require('express');
// var fs = require('fs');
// var multer = require("multer");
// var exceljs = require('exceljs');
var appRoot = require('app-root-path').path;
// var request = require('request');
// var propertiesConfig = require(appRoot + '/config/propertiesConfig.js');
// var queryConfig = require(appRoot + '/config/queryConfig.js');
// var commonDB = require(appRoot + '/public/js/common.db.js');
// var commonUtil = require(appRoot + '/public/js/common.util.js');
// var pythonConfig = require(appRoot + '/config/pythonConfig');
// var PythonShell = require('python-shell')
var sync = require('../util/sync.js');
var oracle = require('../util/oracle.js');
// var execSync = require('sync-exec');
// var ocrUtil = require('../util/ocr.js');
// var Step = require('step');
// const xlsx = require('xlsx');
// const async = require("async");
var sync = require('../util/sync.js');
var difflib = require('difflib');

//PKS 여기서부터 새로 시작


//module.exports = router;
module.exports = {
	classify: function (req, done) {
		sync.fiber(function () {
			try {
                //var retDataList =new Array();
                // mappingSid 추출
                req = sync.await(getMappingSid(req, sync.defer()));
                if(req.docCategory.DOCTOPTYPE == 0)
                {
                    var docTypes = sync.await(refindDocTopType(req, sync.defer()));
                    if (docTypes[1] != 0)
                    {
                        // mappingSid 추출
                        req = sync.await(getMappingSid(req, sync.defer()));
                        // 가변영역추출
                        req = sync.await(findEntry(req,docTypes[0],docTypes[1], sync.defer()));
                    }
                }
                else
                {
                    // 가변영역추출
                    req = sync.await(findEntry(req,req.docCategory.DOCTYPE,req.docCategory.DOCTOPTYPE, sync.defer()));
                }

                //retDataList.push(req);

				return done(null, req);
			} catch (e) {
				console.log(e);
			}

		});
	}
};


function getMappingSid(req, done) {
	sync.fiber(function () {
		try {
			var retData = [];
            var docType = req.docCategory.DOCTYPE;
            
            retData["docCategory"]= req.docCategory;
			for (var i in req.data) {
				var item = req.data[i];
			    var sid = sync.await(oracle.selectSid(req.data[i], sync.defer()));
				var loc = req.data[i].location.split(',');
				var mappingSid = String(docType) + "," + String(loc[0]) + "," + String(loc[1]) + "," + String(parseInt(loc[0]) + parseInt(loc[2])) + "," + String(req.data[i]["sid"]);
				req.data[i]["mappingSid"] = mappingSid;
			}
            retData["data"]= req.data;
			
		} catch (e) {
			console.log(e);
		} finally {
			return done(null, retData);
		}

	});
}


function refindDocTopType(req, done) {
	sync.fiber(function () {
		try {
            var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
            var docTopType = 0;
            var docType = 0;
            var maxNum = 0;
            var text = [];
            var strText = "";

            let docTypeList = sync.await(oracle.selectRefindDocTopTypeList(req, sync.defer()));

            for(var j in req.data)
            {
                //console.log( req.data[j].text + " [ "+j+" ] " + req.data[j].text.replace(regExp,""));
                text += (req.data[j].text.replace(regExp,"")) + ",";
                if(j == 20){
                    break;
                }
            }
            console.log(text.length +" |||| "+text);
            if(text.length > 0)
            {
                strText = text.substring(0, text.length -1).toLowerCase();
                for(var i in docTypeList)
                {
                    var ratio = similar(strText, docTypeList[i].DATA);
                    if(ratio > maxNum)
                    {
                        maxNum = ratio;
                        docType = docTypeList[i].DOCTYPE;
                        docTopType = docTypeList[i].DOCTOPTYPE;
                    }
                }
            }
            
		} catch (e) {
			console.log(e);
		} finally {
            if(maxNum > 0.2)
            {
                return done(null, [docTopType,docType]);
            }
            else
            {
                return done(null, [docTopType,docType]);
            }
		}
	});
}

function findEntry(req,docTypeVal, docTopTypeVal, done) {
	sync.fiber(function () {
        try 
        {
            var retData = {};
            var subLabel = [];
            var fixSingleLabel = [];
            var fixMultiLabel = [];
            var fixLabel = [];
            var variLabel = [];
            let docTopTypeParam = [docTopTypeVal];
            let docTypeParam = [docTypeVal];
            
            let labelRows = sync.await(oracle.selectDocIdLabelDefList(docTopTypeParam, sync.defer()));
            
            for(var i in labelRows)
            {
                if(labelRows[i].LABELTYPE == 'T' && labelRows[i].AMOUNT == "submulti")
                {
                    subLabel.push(labelRows[i].SEQNUM);
                }
                else if(labelRows[i].LABELTYPE == 'T' && labelRows[i].AMOUNT == "multi")
                {
                    fixMultiLabel.push(labelRows[i].SEQNUM);
                }
                else if(labelRows[i].LABELTYPE == 'T' && labelRows[i].AMOUNT == "single")
                {
                    fixSingleLabel.push(labelRows[i].SEQNUM);
                }

                if(labelRows[i].LABELTYPE == 'T')
                {
                    fixLabel.push(labelRows[i].SEQNUM);
                }

                if(labelRows[i].LABELTYPE == 'P')
                {
                    variLabel.push(labelRows[i].SEQNUM);
                }
            }    

            //label data 추출
            let labelTrainRows = sync.await(oracle.selectLabelTrainDataList(docTypeParam, sync.defer()));

            for(var j in req.data)
            {
                var mappingSid = req.data[j].mappingSid.split(",");
                
                //console.log("before : "+req.data[j].text + " X : "+mappingSid[1] + " Y : "+mappingSid[2]);

                if(labelTrainRows.length > 0)
                {
                    for (var k in labelTrainRows)
                    {
                        if(mappingSid[1] == labelTrainRows[k].LOCATION_X && mappingSid[2] == labelTrainRows[k].LOCATION_Y )
                        {
                            // console.log("after : "+req.data[j].text + " X : "+mappingSid[1] + " Y : "+mappingSid[2]);
                            // console.log(mappingSid[1] +" || "+ trainRows[k].LOCATION_X);
                            // console.log(mappingSid[2] +" || "+ trainRows[k].LOCATION_Y);
                            req.data[j]["colLbl"] = labelTrainRows[k].CLASS;
                        }
                        else
                        {
                            req.data[j]["colLbl"] = -1;
                        }
                    }
                }
                else
                {
                    req.data[j]["colLbl"] = -1;
                }
            }
            retData["docCategory"] = req.docCategory;
            retData["data"] = req.data;

            //entry data 추출
            let entryTrainRows = sync.await(oracle.selectTrainDataList(docTypeParam, sync.defer()));
            for(var j in req.data)
            {
                var location = req.data[j].location.split(",");
                
                //console.log("before : "+req.data[j].text + " X : "+location[0] + " width : "+location[2] + " Y : "+location[1] + " height : "+location[3] );

                for (var k in entryTrainRows)
                {
                    var locataionX = 0; var locataionWidth = 0; var locataionY = 0; var locataionHeight = 0;

                    locataionX = entryTrainRows[k].OCR_TEXT_X.split(",")[0];
                    locataionWidth = entryTrainRows[k].OCR_TEXT_X.split(",")[1];
                    locataionY = entryTrainRows[k].OCR_TEXT_Y.split(",")[0];
                    locataionHeight = entryTrainRows[k].OCR_TEXT_Y.split(",")[1];

                    // if(location[0] == locataionX && location[2] == locataionWidth && location[1] == locataionY && location[3] == locataionHeight)
                    if(parseInt(location[0]) == parseInt(locataionX) && parseInt(location[1]) == parseInt(locataionY) )
                    {
                        req.data[j]["entryLbl"] = entryTrainRows[k].CLASS;
                        delete req.data[j].colLbl;

                    }
                    else if((parseInt(location[0])+ parseInt(location[2]) == (parseInt(locataionX)+parseInt(locataionWidth))) && 
                            (parseInt(location[1])+ parseInt(location[3]) == (parseInt(locataionY)+parseInt(locataionHeight))) )
                    {
                        req.data[j]["entryLbl"] = entryTrainRows[k].CLASS;
                        delete req.data[j].colLbl;
                    }
                    else if(((parseInt(location[0])+ parseInt(location[2])/2) == ((parseInt(locataionX)+parseInt(locataionWidth))/2)) && 
                            ((parseInt(location[1])+ parseInt(location[3])/2) == ((parseInt(locataionY)+parseInt(locataionHeight))/2)))
                    {
                        req.data[j]["entryLbl"] = entryTrainRows[k].CLASS;
                        delete req.data[j].colLbl;
                    }
                }
            }
            retData["docCategory"] = req.docCategory;
            retData["data"] = req.data;

            //console.log(retData);
			
		} catch (e) {
			console.log(e);
		} finally {
			return done(null, retData);
		}

	});
}


function similar(str, data) {
    return new difflib.SequenceMatcher(null,str, data).ratio();
}
