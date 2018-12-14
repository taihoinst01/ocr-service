# -*- coding: utf-8 -*-
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import numpy as np
import cx_Oracle
import sys
import os
import json
import shutil
import random
import re
import batchUtil as bUtil
import operator
import requests
import base64

id = "ocr"
pw = "taiho123"
sid = "ocrservice"
# ip = "10.10.20.205"
ip = "192.168.0.251"
port = "1521"
connInfo = id + "/" + pw + "@" + ip + ":" + port + "/" + sid

conn = cx_Oracle.connect(connInfo, encoding="UTF-8", nencoding="UTF-8")
curs = conn.cursor()
# rootFilePath = 'C:/ICR/image/MIG/MIG'
regExp = "[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]"


def isfloat(value):
    try:
        float(value)
        return True
    except ValueError:
        return False


def boundaryCheck(str1, str2):
    return abs(int(str1) - int(str2)) < 6


def findLabelDB(inputsid, docType, docTopType):
    labels = bUtil.selectLabelDef(docTopType)

    sql = "SELECT SEQNUM, DATA, CLASS FROM TBL_BATCH_COLUMN_MAPPING_TRAIN"
    curs.execute(sql)
    rows = curs.fetchall()
    result = []
    # {0,1,2,3,35,36,37,38} db에 위치가 일치하면 text sid와 상관없이 label 매핑
    # 위치가 일치하고 label이 여러개일 경우 랜덤 매핑
    ret = []
    for row in rows:
        dbNum = str(row[1]).split(",")
        inputNum = str(inputsid).split(",")

        for label in labels:
            if label[4] == "P" and dbNum[0] == str(docType) and int(row[2]) == int(label[0]):
                # 문서종류 and (Y좌표 and (X좌표 or 넓이))
                if (dbNum[0] == inputNum[0]) and (boundaryCheck(dbNum[2], inputNum[2]) and (
                        boundaryCheck(dbNum[1], inputNum[1]) or boundaryCheck(dbNum[3], inputNum[3]))):
                    ret.append(row[2])
                    result.append(int(row[2]))
                    result.append(0.99)
                    return result
            elif label[4] == "T" and int(row[2]) == int(label[0]):
                if dbNum[4:] == inputNum[4:]:
                    ret.append(row[2])
            elif inputNum[4:] == ['1','1','1','1','1']:
                ret.append(0)
            else:
                if row[1] == inputsid:
                    ret.append(row[2])

    # 나머지 ml predict
    if not ret:
        result.append(-1)
        result.append(0)
        return result
    else:
        if '38' not in ret:
            result.append(int(random.sample(ret, 1)[0]))
        else:
            result.append(-1)
        result.append(0.99)
        return result


def entryLabelDB(columnLabelInt):
    sqlCol = ("SELECT coltype, colnum FROM TBL_COLUMN_MAPPING_CLS ")
    curs.execute(sqlCol)
    colCls = curs.fetchall()

    sqlEnt = ("SELECT coltype, colnum FROM TBL_ENTRY_MAPPING_CLS ")
    curs.execute(sqlEnt)
    entCls = curs.fetchall()

    retEntryNo = 0
    for row in colCls:
        if str(row[1]) == str(columnLabelInt):
            col = row[0]

    for row in entCls:
        if str(row[0]) == str(col):
            retEntryNo = row[1]

    return retEntryNo


def typo(ocrData):
    for ocrItem in ocrData:

        ocrItem['originText'] = ocrItem['text']

        if (isfloat(re.sub('\ |\,|\)|\(', '', ocrItem['text']))):
            ocrItem['text'] = re.sub('\ |\,|\)|\(', '', ocrItem['text'])
        else:
            ocrItem['text'] = ocrItem['text']
        return ocrData


def eval(inputJson, docType, docTopType):
    # inputArr = json.loads(inputJson.encode("ascii", "ignore").decode())
    # 20180911 수직기준으로 가까운 엔트리라벨을 체크하는데 만약 거리가 80이 넘는것만 있을경우 unknown
    # 수직 수평 조회중 our share와 PAID(100%), OSL(100%) 잡히면 PAID(Our Share), OSL(Our Share)로 변경
    # 엔트리라벨이 하나만 잡혔는데 PAID(100%), OSL(100%)일경우 y축 기준 200까지 위 x축기준 200까지를 조회 our share 가 있으면 Our share 로 변경
    inputArr = getSidParsing(getSid(inputJson), docType)

    try:
        for inputItem in inputArr:
            if 'sid' in inputItem:
                colResult = findLabelDB(inputItem['mappingSid'], docType, docTopType)
                inputItem['colLbl'] = colResult[0]
                inputItem['colAccu'] = colResult[1]

        # 전 아이템 중 엔트리 라벨 추출
        entryLabel = []
        for inputItem in inputArr:
            if 'colLbl' in inputItem:
                if bUtil.selectLabelDefLabelType(inputItem['colLbl']) == 'T':
                    entryLabel.append(inputItem)

        # 전 아이템 중 엔트리 추출 후 같은 열이나 같은 행에 엔트리 라벨 검색
        for inputItem in inputArr:
            if inputItem['colLbl'] == 0:
                entLoc = inputItem['mappingSid'].split(",")[0:4]

                horizItem = 9999
                vertItem = 9999
                entryPlus = 0

                for lblItem in entryLabel:
                    lblLoc = lblItem['mappingSid'].split(",")[0:4]

                    # 같은 문서 검사
                    if entLoc[0] == lblLoc[0]:
                        # 같은 라인 검사
                        if boundaryCheck(entLoc[2], lblLoc[2]):
                            inputItem['entryLbl'] = lblItem['colLbl']
                            horizItem = lblItem['colLbl']

                        # 20180911 수직기준으로 가까운 엔트리라벨을 체크하는데 만약 거리가 80이 넘는것만 있을경우 unknown
                        if bUtil.checkVerticalEntry(entLoc, lblLoc):
                            if lblItem['colLbl'] == 141:
                                entryPlus = 25
                            elif lblItem['colLbl'] == 142:
                                entryPlus = 50
                            elif lblItem['colLbl'] == 143:
                                entryPlus = 75
                            elif lblItem['colLbl'] == 144:
                                entryPlus = 100

                if 'entryLbl' not in inputItem:
                    inputItem['entryLbl'] = 999

                inputItem['entryLbl'] = inputItem['entryLbl'] + entryPlus

        # for item in inputArr:
        #     print(item)
        return inputArr

    except Exception as e:
        raise Exception(str(
            {'code': 500, 'message': 'column mapping predict fail', 'error': str(e).replace("'", "").replace('"', '')}))


def selectOcrDataFromFilePath(filepath):
    try:
        selectocrDataSql = "SELECT OCRDATA FROM TBL_BATCH_OCR_DATA WHERE FILEPATH = :filepath"
        curs.execute(selectocrDataSql, {"filepath": filepath})
        rows = curs.fetchall()

        if rows:
            return json.loads(rows[0][0])
        else:
            raise Exception('row for file path does not exist')

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_BATCH_OCR_DATA table select fail',
                             'error': str(e).replace("'", "").replace('"', '')}))


def selectBannedWord():
    returnData = []
    try:
        selectBannedWordSql = "SELECT WORD FROM TBL_BANNED_WORD"
        curs.execute(selectBannedWordSql)
        rows = curs.fetchall()
        if rows:
            for row in rows:
                returnData.append(row[0])

        return returnData

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_BANNED_WORD table select fail',
                             'error': str(e).replace("'", "").replace('"', '')}))


def insertOcrSymspell(sentences):
    try:
        for sentence in sentences:
            words = sentence["text"].split(' ')
            for word in words:
                tempstr = word
                if tempstr:
                    selectSymspellSql = "SELECT COUNT(SEQNUM) FROM TBL_OCR_SYMSPELL WHERE KEYWORD = LOWER(:keyword)"
                    curs.execute(selectSymspellSql, {"keyword": tempstr})
                    symspellRows = curs.fetchall()
                    if symspellRows[0][0] == 0:
                        insertSymspellSql = "INSERT INTO TBL_OCR_SYMSPELL VALUES (SEQ_OCR_SYMSPELL.nextval, LOWER(:keyword), 1)"
                        curs.execute(insertSymspellSql, {"keyword": tempstr})
        conn.commit()

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_OCR_SYMSPELL table insert fail',
                             'error': str(e).replace("'", "").replace('"', '')}))


def getSid(data):
    try:
        selectExportSidSql = "SELECT EXPORT_SENTENCE_SID (LOWER(:sentence)) AS SID FROM DUAL"
        for item in data:
            text = re.sub(regExp, '', item["text"])
            curs.execute(selectExportSidSql, {"sentence": text})
            exportSidRows = curs.fetchall()
            item["sid"] = exportSidRows[0][0]

        return data

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'EXPORT_SENTENCE_SID2 function execute fail',
                             'error': str(e).replace("'", "").replace('"', '')}))


def getDocSid(data):
    try:
        selectExportSidSql = "SELECT EXPORT_SENTENCE_SID (LOWER(:sentence)) AS SID FROM DUAL"
        retDocSid = ''

        for sentence in data:
            tempstr = re.sub(regExp, '', sentence["text"])

            if not tempstr:
                tempstr = ' '

            curs.execute(selectExportSidSql, {"sentence": tempstr})
            exportSidRows = curs.fetchall()
            retDocSid += ',' + exportSidRows[0][0]

            # data length 에 상관없이 5회 반복 만약 data의 length가 5보다 적으면 적은 갯수만큼 ,0,0,0,0,0 입력
        if len(data) < 5:
            for i in range(len(data), 5):
                retDocSid += ',0,0,0,0,0'
        return retDocSid[1:]

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'EXPORT_SENTENCE_SID function execute fail',
                             'error': str(e).replace("'", "").replace('"', '')}))


def getSidParsing(data, docType):
    try:
        for item in data:
            loc = item["location"].split(',')
            item["mappingSid"] = str(docType) + "," + str(loc[0]) + "," + str(loc[1]) + "," + str(
                int(loc[0]) + int(loc[2])) + "," + str(item["sid"])

        return data

    except Exception as e:
        raise Exception(
            str({'code': 500, 'message': 'sid parsing fail', 'error': str(e).replace("'", "").replace('"', '')}))


def selectFormMapping(sentencesSid):
    try:
        selectFormMappingSql = "SELECT CLASS FROM TBL_FORM_MAPPING WHERE DATA = :data"
        curs.execute(selectFormMappingSql, {"data": sentencesSid})
        rows = curs.fetchall()
        return rows

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_FORM_MAPPING table select fail',
                             'error': str(e).replace("'", "").replace('"', '')}))


def azureFormMapping(sentencesSid):
    try:
        params = {"data": sentencesSid, "type": "formMapping"}
        response = requests.post(url='http://192.168.0.149:8888/ml/api', data=params)
        r = response.json()

        selectDocCategorySql = "SELECT SEQNUM, DOCNAME, DOCTYPE, SAMPLEIMAGEPATH FROM TBL_DOCUMENT_CATEGORY WHERE DOCTYPE = :docType"
        curs.execute(selectDocCategorySql, {"docType": r["DOCTYPE"]})
        rows = curs.fetchall()

        if rows:
            return {"SEQNUM": rows[0][0], "DOCNAME": rows[0][1], "DOCTYPE": rows[0][2], "SAMPLEIMAGEPATH": rows[0][3],
                    "DOCSCORE": r["SCORE"]}
        else:
            return {}
    except Exception as e:
        raise Exception(
            str({'code': 500, 'message': 'azure form mapping fail', 'error': str(e).replace("'", "").replace('"', '')}))


def selectDocCategory(docType):
    try:
        selectDocCategorySql = "SELECT SEQNUM, DOCNAME, DOCTYPE, DOCTOPTYPE, SAMPLEIMAGEPATH FROM TBL_DOCUMENT_CATEGORY WHERE DOCTYPE = :docType"
        curs.execute(selectDocCategorySql, {"docType": int(docType)})
        rows = curs.fetchall()

        if rows:
            return {"SEQNUM": rows[0][0], "DOCNAME": rows[0][1], "DOCTYPE": rows[0][2], "DOCTOPTYPE" : rows[0][3], "SAMPLEIMAGEPATH": rows[0][4],
                    "DOCSCORE": 0.99}
        else:
            return {}

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_DOCUMENT_CATEGORY table select',
                             'error': str(e).replace("'", "").replace('"', '')}))


def makeindex(location):
    temparr = location.split(",")
    for i in range(0, 5):
        if (len(temparr[0]) < 5):
            temparr[0] = '0' + temparr[0]
    return int(temparr[1] + temparr[0])


def sortArrLocation(inputArr):
    tempArr = []
    retArr = []
    for item in inputArr:
        if item['location']:
            tempArr.append((makeindex(item['location']), item))
    tempArr.sort(key=operator.itemgetter(0))
    for tempItem in tempArr:
        retArr.append(tempItem[1])
    return retArr


def colLblDefaultValue(data):
    for item in data:
        if not 'colLbl' in item:
            item['colLbl'] = 38
    return data


if __name__ == '__main__':
    try:
        # 입력받은 ocr data를 json 변환
        # ocrData = json.loads('[{"location":"1933,350,346,94","text":"SJLTRe"},{"location":"1934,524,396,28","text":"JLT Re (North America) Inc."},{"location":"1935,578,169,22","text":"United Plaza"},{"location":"1934,605,414,34","text":"30 South 17th Street, 17th Floor"},{"location":"1935,647,313,28","text":"Philadelphia, PA 19103"},{"location":"1934,717,46,22","text":"Tel:"},{"location":"2080,717,225,22","text":"+1 215 309 4500"},{"location":"119,865,466,32","text":"Korean Reinsurance Company"},{"location":"117,905,470,32","text":"80 Susong-Dong, Chongno-Gu"},{"location":"118,944,84,25","text":"Seoul"},{"location":"119,983,593,32","text":"Democratic Peoples Republic of Korea"},{"location":"1291,857,230,25","text":"Risk Reference"},{"location":"1290,897,216,25","text":"Claim Number"},{"location":"1289,936,248,25","text":"Transaction Ref."},{"location":"1288,976,239,25","text":"Your Reference"},{"location":"1288,1016,255,25","text":"Account Number"},{"location":"1291,1056,67,25","text":"Date"},{"location":"1290,1094,115,25","text":"Contact"},{"location":"1291,1174,362,32","text":"Karen.Hunter@jltre.com"},{"location":"1933,770,186,28","text":"www.jltre.com"},{"location":"1705,857,238,25","text":"E27958-2015-N"},{"location":"1705,897,296,25","text":"MCR 186098 1/15"},{"location":"1705,936,151,25","text":"10287249"},{"location":"1703,976,67,25","text":"TBA"},{"location":"1703,1016,303,25","text":"20002523/US-UWR"},{"location":"1705,1056,199,32","text":"16 April 2018"},{"location":"1681,1094,225,25","text":": Karen Hunter"},{"location":"1704,1134,257,25","text":"+1 215 309 4487"},{"location":"119,1062,292,25","text":"For the attention of:"},{"location":"119,1102,222,25","text":"Mr. Steve Choi"},{"location":"119,1387,160,25","text":"Reassured"},{"location":"118,1426,238,32","text":"Original Insured"},{"location":"119,1466,93,24","text":"Period"},{"location":"117,1506,73,31","text":"Type"},{"location":"119,1545,85,24","text":"Limits"},{"location":"119,1585,110,24","text":"Interest"},{"location":"420,1387,576,32","text":"Concord Group Insurance Companies"},{"location":"418,1426,282,25","text":"Winter Event 2015"},{"location":"419,1465,444,25","text":"01 Jan 2015 TO 01 Jan 2017"},{"location":"421,1506,125,31","text":"Property"},{"location":"421,1544,306,25","text":"USD XS"},{"location":"421,1584,399,32","text":"First Property Catastrophe"},{"location":"118,1665,2121,31","text":"highly persistent cold and snowy pattern that developed in early January and continued through March. While colder than normal conditions"},{"location":"118,1703,2184,32","text":"prevailed in the eastern U.S., the headline of the winter was the incredible snowfall totals across the Northeastern U.S. which aided the extreme"},{"location":"117,1744,67,24","text":"cold."},{"location":"119,1783,1464,32","text":"Further to the Reassureds Proof of Loss, below is the reinstatement calculation for your records:"},{"location":"119,1905,286,25","text":"Paid Loss to Cover"},{"location":"118,1947,170,25","text":"Cover Limit"},{"location":"116,1989,161,25","text":"x Premium"},{"location":"116,2031,127,25","text":"At 1000/0"},{"location":"119,2072,314,32","text":"Less Prior Payments"},{"location":"119,2114,179,25","text":"Due Hereon"},{"location":"119,2155,348,25","text":"Federal Excise Tax 1%"},{"location":"119,2197,591,32","text":"Reinstatement Premium Brokerage 5%"},{"location":"119,2238,207,25","text":"Net Premium"},{"location":"119,2321,319,32","text":"Due to you 1.0000%"},{"location":"1244,1863,69,25","text":"USD"},{"location":"1185,1989,170,30","text":"668,208.59"},{"location":"1185,2031,164,30","text":"545,562.71"},{"location":"1185,2072,170,30","text":"540,662.67"},{"location":"1223,2114,131,30","text":"4,900.04"},{"location":"1270,2155,84,25","text":"49.00"},{"location":"1252,2197,103,25","text":"245.00"},{"location":"1222,2238,132,31","text":"4,606.04"},{"location":"1269,2321,84,25","text":"46.06"},{"location":"119,2369,1521,32","text":"Please send all claims correspondence through our electronic mailbox at JLT .CLAlMS@JLTRE.com"},{"location":"913,3297,653,24","text":"JLT Re is a trading name of JLT Re (North America) Inc."}]')
        # ocrData = json.loads('[{"location": "579,106,112,35", "text": "외래"},{"location": "446,161,245,24", "text": "환 자 등록번호 환"},{"location": "748,49,803,34", "text": " 소방자량 길터주기로 소중한 생명을 지킵시다 !!"},{"location": "750,106,840,42", "text": "입원(딥퇴원 중간)진료비 계산서  영수증"},{"location": "1698,131,132,22", "text": "(환자보관용)"},{"location": "749,160,186,26", "text": "자 성 영"},{"location": "734,229,202,25", "text": " 6) 번호"},{"location": "157,220,226,17", "text": "2015년 해운대구 최초 시생 병원"},{"location": "60,359,305,46", "text": "보호자없는 병동"},{"location": "53,421,336,54", "text": "포괄간호서비스"},{"location": "114,558,198,28", "text": "간별의 부암| 넣는"},{"location": "66,594,294,30", "text": "전문 간화터비스를 만나카."},{"location": "64,1061,159,31", "text": "안심하세요!"},{"location": "37,1104,197,21", "text": "옆에서 지켜드리고 싶은"},{"location": "59,1132,150,20", "text": "마음까지 병원에서"},{"location": "83,1158,102,20", "text": "책임 집니다"},{"location": "115,1358,196,28", "text": "포괄 간호 서비스"},{"location": "50,1406,322,20", "text": ">보호자나 간병인이 환자 결에 없어도"},{"location": "68,1434,276,21", "text": "간호인력이 전적으로 간호합니다."},{"location": "68,1475,308,21", "text": "전문 간호사의 수준높은 서비스로 입원"},{"location": "67,1504,291,21", "text": "생활을 걱정 하지 않으셔도 됩니다."},{"location": "49,1544,301,21", "text": ">환자의 간병비 부담을 해소합니다."},{"location": "1038,230,21,24", "text": "병"},{"location": "1131,161,101,24", "text": "진 료"},{"location": "1176,230,22,23", "text": "실"},{"location": "1210,296,21,24", "text": "비"},{"location": "1176,331,50,24", "text": "선택"},{"location": "1161,362,79,22", "text": "진료료"},{"location": "1288,162,100,25", "text": "기 간"},{"location": "1356,230,108,24", "text": "환자구분"},{"location": "1310,271,70,17", "text": "미 그"},{"location": "1272,297,85,23", "text": "급 여"},{"location": "1605,164,195,24", "text": "야간(공휴일)진료"},{"location": "1592,197,88,23", "text": " 야 간"},{"location": "1708,197,104,24", "text": " 공휴일"},{"location": "1605,231,192,24", "text": "선 택 교 수 명"},{"location": "1496,296,184,25", "text": "금 액 산 정"},{"location": "1714,297,78,24", "text": "내 용"},{"location": "1672,350,130,26", "text": "1,122.336"},{"location": "1698,417,107,25", "text": "931,640"},{"location": "1888,213,26,27", "text": "층"},{"location": "1952,213,156,28", "text": "진료과/검사실"},{"location": "2149,107,119,34", "text": ")님께서"},{"location": "2146,152,165,31", "text": "가셔야할곳"},{"location": "2169,216,110,25", "text": "예약일시"},{"location": "448,232,19,19", "text": "신"},{"location": "472,395,21,23", "text": "진"},{"location": "544,232,22,21", "text": "과"},{"location": "540,395,90,24", "text": "찰 료"},{"location": "702,328,201,24", "text": "일 부 본 인 부 담"},{"location": "1025,330,50,25", "text": "전액"},{"location": "651,360,453,27", "text": "본인 부담금 공단부담금 본 인부 담"},{"location": "472,429,158,22", "text": "입 원 료"},{"location": "432,496,192,37", "text": "기 주약및 행위로"},{"location": "471,528,152,24", "text": "조제료 약품비"},{"location": "552,563,72,23", "text": "행위료"},{"location": "471,579,64,23", "text": "주사료"},{"location": "552,596,71,23", "text": "약품비"},{"location": "472,629,159,23", "text": "마 취 료"},{"location": "472,663,158,23", "text": "처지및수술료"},{"location": "432,691,197,28", "text": "항 검 사 료"},{"location": "472,728,158,25", "text": "영 상 진 단 료"},{"location": "472,763,158,23", "text": "방사선치료료"},{"location": "433,796,195,24", "text": "- 치 료재 료 대"},{"location": "471,830,158,24", "text": "재활 및 을리치료료"},{"location": "472,864,158,23", "text": "정 신 요 법 료"},{"location": "471,896,159,24", "text": "전결 및 혈으썽라IJ료"},{"location": "470,931,160,22", "text": "CT 진 단 료"},{"location": "472,963,157,23", "text": "M RI 진 단료"},{"location": "433,997,197,30", "text": "택 초음파진단료"},{"location": "471,1030,157,24", "text": "병 실 차 액"},{"location": "432,1057,197,30", "text": "항 제 증 명 료"},{"location": "435,1164,186,24", "text": "포괄수가진료비"},{"location": "600,1214,22,24", "text": "계"},{"location": "434,1264,188,24", "text": "상 한 액 초 과 금"},{"location": "435,1297,188,24", "text": "요 양 기 관 종 류"},{"location": "435,1331,188,23", "text": "사업자등록번호"},{"location": "1284,331,300,26", "text": "선택진료료 진 료 비 총액"},{"location": "1442,363,172,21", "text": "(1+출1+출+과+"},{"location": "1440,401,175,21", "text": "환자 부담 총액 "},{"location": "1441,498,141,22", "text": "단 체 부 담 액"},{"location": "1441,531,174,23", "text": "이미납부한금액(삐"},{"location": "1440,564,175,24", "text": "감 면 액 수의"},{"location": "1441,598,174,23", "text": "미 수 액 "},{"location": "1441,632,110,24", "text": "납 부 할 금"},{"location": "1442,664,171,22", "text": "((하-9-따-(if쯰-)"},{"location": "1515,698,96,22", "text": "카 드"},{"location": "1515,732,99,22", "text": "현금영수증"},{"location": "1447,748,49,23", "text": "금 액"},{"location": "1516,765,94,23", "text": "현 금"},{"location": "1456,779,31,23", "text": "(삐"},{"location": "1515,799,95,22", "text": "합 계"},{"location": "1440,832,172,23", "text": "납부삶지않은금액(따흐)"},{"location": "1440,865,171,23", "text": "선택 진료신청"},{"location": "1440,898,195,25", "text": "현 금 영 수 증 ("},{"location": "1440,932,173,23", "text": "신분 확인 번호"},{"location": "1440,965,173,24", "text": "현 금 승인 번호"},{"location": "1328,362,48,23", "text": "이외"},{"location": "1387,969,31,23", "text": "00"},{"location": "1756,567,74,22", "text": "87 44"},{"location": "1925,548,339,25", "text": "대표전화 : 051)709-3000"},{"location": "1928,648,333,28", "text": "진 료 접수 ( 예 약) 증"},{"location": "1881,714,127,27", "text": "등록 번호"},{"location": "1743,766,90,26", "text": "844,20"},{"location": "1880,781,126,27", "text": "환자 성명"},{"location": "1744,800,89,23", "text": "844 20"},{"location": "1881,848,127,26", "text": "진 료 과"},{"location": "1662,866,57,22", "text": " 유"},{"location": "1881,914,127,27", "text": "진료의 사"},{"location": "1881,982,124,26", "text": "진 료 일"},{"location": "1880,1048,127,27", "text": "진료 시간"},{"location": "1980,1117,27,22", "text": "고"},{"location": "705,1198,24,23", "text": "(월"},{"location": "712,1224,85,24", "text": "57,631"},{"location": "874,1222,85,25", "text": "190,69"},{"location": "753,1298,370,23", "text": "의원 급  보건 기관 u병원 급"},{"location": "779,1332,303,23", "text": "6 1 7-90-65 592"},{"location": "1161,1299,125,23", "text": "종합병원"},{"location": "1237,1332,24,24", "text": "상"},{"location": "1525,998,234,26", "text": "신용카드매출전표"},{"location": "1440,1032,173,24", "text": "카 드 종 류"},{"location": "1440,1066,173,22", "text": "카 드 번 호"},{"location": "1440,1099,173,23", "text": "가 맹 점 번 호"},{"location": "1490,1133,123,22", "text": "인 번 호"},{"location": "1440,1166,173,23", "text": "할 부 기 간"},{"location": "1440,1200,171,23", "text": "결 제 금 액"},{"location": "1512,1232,256,24", "text": "위 금액을 정히 영수함."},{"location": "1440,1265,334,25", "text": "수납일: 2016/03/2수납자: 홍슬기"},{"location": "1325,1299,395,24", "text": "상급종합병원 (종합전문요양기-,"},{"location": "1523,1332,154,26", "text": "효 성 시 티"},{"location": "435,1363,825,28", "text": "사 업 장 소 재 지 부산광역시 해운대구 해운대로 135(재송등1094-2) 해운대경찰서옆…"},{"location": "474,1424,726,24", "text": "이 계산서  영수증은 소득세법살 의료비 골제신청에 사용할 수 있습니다."},{"location": "448,1465,611,23", "text": " 이 계산서  영수증에 대한 세부내역을 요구한 수 있습니다."},{"location": "474,1507,659,23", "text": "전액본인부당이란 국민건강보험법 시행규칙 별표 5의 규정에 의한"},{"location": "473,1548,526,23", "text": "요양급여비용의 본인전액부담 항목 비용을 말합니다."},{"location": "1317,1366,106,24", "text": "표 자"},{"location": "1706,1362,138,33", "text": "햠햰|"},{"location": "1642,1366,50,26", "text": "외 1"},{"location": "1720,1400,112,35", "text": "되의"},{"location": "1303,1451,405,71", "text": "(썬) 효성시El병원"},{"location": "1346,1541,331,24", "text": "대표전화 : (051)709-3000"}]')
        seqnum = sys.argv[1]
        # seqnum = 234
        ocrData = bUtil.selectOcrData(seqnum)

        ocrData = json.loads(ocrData)
        # 입력받은 파일 패스로 ocr 데이터 조회
        # ocrData = selectOcrDataFromFilePath(sys.argv[1])
        # ocr데이터 오타수정
        ocrData = typo(ocrData)

        # TBL_OCR_BANNED_WORD 에 WORD칼럼 배열로 전부 가져오기
        bannedWords = selectBannedWord()

        # 20180911 ocr데이터 정렬 y축 기준
        ocrData = sortArrLocation(ocrData)

        # bannedword에 상관없이 similar에 사용할 5개 문장 추출
        # similarSentence = []
        # for item in ocrData:
        #     similarSentence.append(item)
        #     if len(similarSentence) == 5:
        #

        # 문장단위로 for문
        sentences = []
        for item in ocrData:
            # 문장의 앞부분이 가져올 BANNEDWORD와 일치하면 5개문장에서 제외
            isBanned = False
            for i in bannedWords:
                text = item["text"]
                if text.lower().find(str(i)) == 0:
                    isBanned = True
                    break
            if not isBanned:
                sentences.append(item)
                if len(sentences) == 5:
                    break

                    # 최종 5개 문장이 추출되면 각문장의 단어를 TBL_OCR_SYMSPELL 에 조회후 없으면 INSERT
        insertOcrSymspell(sentences)

        # 5개문장의 SID를 EXPORT_SENTENCE_SID 함수를 통해 SID 추출
        sentencesSid = getDocSid(sentences)

        # TBL_FORM_MAPPING에 5개문장의 SID를 조회
        formMappingRows = selectFormMapping(sentencesSid)

        # TBL_DOCUMENT_SENTENCE에 5개의 문장 조회
        ratio, documentSentenceDoctype = bUtil.classifyDocument(ocrData)

        # 20180911 doc type 이 1인 경우(NOT INVOICE)는 바로 리턴 EVAL 안함 1이외의 경우는 레이블 정보 추출
        obj = {}

        if formMappingRows:
            obj["docCategory"] = selectDocCategory(formMappingRows[0][0])
        elif documentSentenceDoctype and ratio > 0.5:
            obj["docCategory"] = selectDocCategory(documentSentenceDoctype)
        else:
            obj["docCategory"] = selectDocCategory(0)

        # if formMappingRows and formMappingRows[0][0] == 1:
        #     obj["data"] = ocrData
        #     obj["data"] = colLblDefaultValue(obj["data"])
        # elif formMappingRows and formMappingRows[0][0] == 0:
        #     obj["data"] = ocrData
        #     obj["data"] = colLblDefaultValue(obj["data"])
        # elif formMappingRows:
        #     obj["data"] = eval(ocrData, formMappingRows[0][0])
        # elif documentSentenceDoctype and ratio > 0.5:
        #     obj["data"] = eval(ocrData, documentSentenceDoctype)
        # else:
        #     obj["data"] = eval(ocrData, azureFormMappingRows["DOCTYPE"])

        if formMappingRows:
            if formMappingRows[0][0] == 1 or formMappingRows[0][0] == 0:
                obj["data"] = ocrData
                obj["data"] = colLblDefaultValue(obj["data"])
            else:
                obj["data"] = eval(ocrData, formMappingRows[0][0])
        elif documentSentenceDoctype and ratio > 0.5:
            if documentSentenceDoctype == 1 or documentSentenceDoctype == 0:
                obj["data"] = ocrData
                obj["data"] = colLblDefaultValue(obj["data"])
            else:
                obj["data"] = eval(ocrData, obj["docCategory"]["DOCTYPE"], obj["docCategory"]["DOCTOPTYPE"])
        else:
            obj["data"] = eval(ocrData, obj["docCategory"]["DOCTYPE"], obj["docCategory"]["DOCTOPTYPE"])

        obj["docSid"] = sentencesSid

        result = re.sub('None', "null", json.dumps(obj, ensure_ascii=False))

        # 개발용
        # print(result)
        # 배포용
        print(base64.b64encode(result.encode('utf-8')))

        '''
        if formMappingRows:
            if formMappingRows[0] != 1:
                print(eval(ocrData, formMappingRows[0][0]))
            else:
                print(ocrData)
        else:
            print(ocrData)
        '''

    except Exception as e:
        print(e)

