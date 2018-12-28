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
    return abs(int(str1) - int(str2)) < 10

def boundaryCheckP(str1, str2):
    return abs(int(str1) - int(str2)) < 1

def priceCheck(str1, str2):
    return abs(int(str1) - int(str2)) < 40

def leftLabelCheck(entLoc, lblLoc):
    return  -1000 < int(lblLoc[1]) - int(entLoc[1]) < 0


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
                if (dbNum[0] == inputNum[0]) and (boundaryCheck(dbNum[2], inputNum[2]) and (boundaryCheck(dbNum[1], inputNum[1]) and boundaryCheckP(dbNum[3], inputNum[3]))):
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

        for label in entryLabel:
            if label['colLbl'] == 136 or label['colLbl'] == 137:
                label['colLbl'] = bUtil.selectLabelBehaviorDrug(label, entryLabel)
            if label['colLbl'] == 25:
                label['colLbl'] = bUtil.selectLabelAmountPaid(label, entryLabel)

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
                        if boundaryCheck(entLoc[2], lblLoc[2]) and leftLabelCheck(entLoc, lblLoc):
                            inputItem['entryLbl'] = lblItem['colLbl']
                            horizItem = lblItem['colLbl']

                        if priceCheck(entLoc[2], lblLoc[2]) and leftLabelCheck(entLoc, lblLoc):
                            if lblItem['colLbl'] == 126 or lblItem['colLbl'] == 145:
                                inputItem['entryLbl'] = lblItem['colLbl']

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

        for item in inputArr:
            print(item)
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
            num = re.sub(',| ', '', text)

            if num.isdigit():
                curs.execute(selectExportSidSql, {"sentence": num})
            else:
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
        # seqnum = sys.argv[1]
        seqnum = 391

        ocrData = bUtil.selectOcrData(seqnum)

        # 입력받은 ocr data를 json 변환
        ocrData = json.loads(ocrData)
        ocrData = typo(ocrData)

        # 언어 감지
        langDetect = bUtil.langDetect(ocrData)

        # ocr데이터 오타수정
        ocrData = bUtil.typoSentence(ocrData, langDetect)

        #sid 추출
        ocrData = getSid(ocrData)

        # 고정영역 추출
        ocrData = bUtil.findFixLabel(ocrData)

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
