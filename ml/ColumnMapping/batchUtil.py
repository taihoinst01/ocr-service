# -*- coding: utf-8 -*-
import cx_Oracle
import json
import operator
import re
import os
from difflib import SequenceMatcher
from symspellpy.symspellpy import SymSpell, Verbosity
from langdetect import detect
import math
import urllib.request

id = "ocr"
pw = "taiho123"
sid = "ocrservice"
# ip = "10.10.20.205"
ip = "192.168.0.251"
port = "1521"
connInfo = id + "/" + pw + "@" + ip + ":" + port + "/" + sid

conn = cx_Oracle.connect(connInfo, encoding="UTF-8", nencoding = "UTF-8")
curs = conn.cursor()
rootFilePath = 'C:/ICR/image/MIG/MIG'
regExp = "[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]"

def boundaryCheck(str1, str2):
    return abs(int(str1) - int(str2)) < 18

def getColumnMappingCls():
    try:
        sql = 'SELECT COLNAME, COLTYPE, COLNUM, POSITIONYN, ENTRYLABELYN FROM TBL_COLUMN_MAPPING_CLS'
        curs.execute(sql)
        colCls = curs.fetchall()

        return colCls

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'getEntryLabelYN table select fail',
                             'error': str(e).replace("'", "").replace('"', '')}))

def getEntryLabelYN(colNum):
    try:
        sql = 'SELECT COLNAME, COLTYPE, COLNUM, POSITIONYN, ENTRYLABELYN FROM TBL_COLUMN_MAPPING_CLS WHERE COLNUM = :colNum'
        curs.execute(sql, {"colNum":colNum})
        entryLabelYN = curs.fetchall()

        return entryLabelYN[0][4]

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'getEntryLabelYN table select fail',
                             'error': str(e).replace("'", "").replace('"', '')}))

def checkVerticalEntry(entLoc, lblLoc):
    try:
        lblwidthLoc = (int(lblLoc[3]) + int(lblLoc[1])) / 2
        entwidthLoc = (int(entLoc[3]) + int(entLoc[1])) / 2
        # entryLabel이 오른쪽에서 가까울 경우 제외
        if -50 < entwidthLoc - lblwidthLoc < 160:
            return True
        else:
            return False

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'checkVerticalEntry fail',
                         'error': str(e).replace("'", "").replace('"', '')}))

def chekOurShareEntry(horizItem, vertItem):
    try:

        if (int(horizItem) == 0 and int(vertItem) == 30) or (int(horizItem) == 30 and int(vertItem) == 0):
            return True
        elif (int(horizItem) == 2 and int(vertItem) == 30) or (int(horizItem) == 30 and int(vertItem) == 2):
            return True
        else:
            return False

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'chekOurShareEntry fail',
                             'error': str(e).replace("'", "").replace('"', '')}))

def selectContractMapping(ocrData):
    try:
        selectContractMappingSql = "SELECT asOgcompanyName legacy FROM tbl_contract_mapping WHERE extOgcompanyName = :extOgcompanyName"
        for idx, item in enumerate(ocrData):
            curs.execute(selectContractMappingSql, {"extOgcompanyName": item["text"]})
            rows = curs.fetchall()
            if rows:
                ocrData[idx]["text"] = rows[0][0]

        return ocrData
    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_CONTRACT_MAPPING table select',
                             'error': str(e).replace("'", "").replace('"', '')}))

def appendSentences(ocrData, bannedWords):
    sentences = []
    for item in ocrData:
        # 문장의 앞부분이 가져올 BANNEDWORD와 일치하면 5개문장에서 제외
        isBanned = False
        text = item["text"]
        for i in bannedWords:
            if text.lower().find(str(i)) == 0:
                isBanned = True
                break
        if not isBanned:
            sentences.append(item)
            if len(sentences) == 5:
                break

    return sentences

def selectDocCategory(docType):
    try:
        if not docType:
            docType = 0
        selectDocCategorySql = "SELECT SEQNUM, DOCNAME, DOCTYPE, SAMPLEIMAGEPATH FROM TBL_DOCUMENT_CATEGORY WHERE DOCTYPE = :docType"
        curs.execute(selectDocCategorySql, {"docType": int(docType)})
        rows = curs.fetchall()

        if rows:
            return {"SEQNUM": rows[0][0], "DOCNAME": rows[0][1], "DOCTYPE": rows[0][2], "SAMPLEIMAGEPATH": rows[0][3]}
        else:
            return {}

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_DOCUMENT_CATEGORY table select',
                             'error': str(e).replace("'", "").replace('"', '')}))

def selectFormMapping(sentencesSid):
    try:
        selectFormMappingSql = "SELECT CLASS FROM TBL_FORM_MAPPING WHERE DATA = :data"
        curs.execute(selectFormMappingSql, {"data": sentencesSid})
        rows = curs.fetchall()
        return rows

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_FORM_MAPPING table select fail',
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
            retDocSid += exportSidRows[0][0] + ","

        retDocSid = retDocSid[:-1]
        # data length 에 상관없이 5회 반복 만약 data의 length가 5보다 적으면 적은 갯수만큼 ,0,0,0,0,0 입력
        if len(data) < 5:
            for i in range(len(data) + 1, 5):
                retDocSid += ',0,0,0,0,0'
        return retDocSid

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'EXPORT_SENTENCE_SID function execute fail',
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
                    if symspellRows[0] == 0:
                        insertSymspellSql = "INSERT INTO TBL_OCR_SYMSPELL VALUES (SEQ_OCR_SYMSPELL.nextval, LOWER(:keyword), 1)"
                        curs.execute(insertSymspellSql, {"keyword": tempstr})
        conn.commit()

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_OCR_SYMSPELL table insert fail',
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

def makeindex(location):
    if len(location) > 0:
        temparr = location.split(",")
        for i in range(0, 5):
            if (len(temparr[0]) < 5):
                temparr[0] = '0' + temparr[0]
        return int(temparr[1] + temparr[0])
    else:
        return 999999999999

def sortArrLocation(inputArr):
    tempArr = []
    retArr = []
    for item in inputArr:
        tempArr.append((makeindex(item['location']), item))
    tempArr.sort(key=operator.itemgetter(0))
    for tempItem in tempArr:
        retArr.append(tempItem[1])
    return retArr

def selectBatchLearnList(filepath):
    try:
        selectFormMappingSql = "SELECT DOCTYPE FROM TBL_BATCH_LEARN_LIST WHERE FILEPATH = :filepath"
        curs.execute(selectFormMappingSql, {"filepath": filepath})
        rows = curs.fetchall()
        return rows

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_BATCH_LEARN_LIST table select fail',
                             'error': str(e).replace("'", "").replace('"', '')}))

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

def selectNotInvoice(sentences):
    try:
        text = ''
        for item in sentences:
            text += item["text"] + ","
        text = text[:-1].lower()

        selectNoInvoiceSql = "SELECT DATA,DOCTYPE FROM TBL_NOTINVOICE_DATA"
        curs.execute(selectNoInvoiceSql)
        selNotInvoice = curs.fetchall()

        for rows in selNotInvoice:
            ratio = similar(text, rows[0])
            if ratio > 0.9:
                return ratio, rows

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_NOTINVOICE_DATA table select fail',
                             'error': str(e).replace("'", "").replace('"', '')}))

def classifyDocument(ocrData):
    try:
        selectDocumentSql = "SELECT DATA, DOCTYPE, SENTENCELENGTH FROM TBL_DOCUMENT_SENTENCE"
        curs.execute(selectDocumentSql)
        selDocument = curs.fetchall()

        maxNum = 0
        row = ''

        for rows in selDocument:
            sentenceLeng = rows[2]
            text = ''
            for i, item in enumerate(ocrData):
                text += re.sub(regExp,'',item["text"]) + ","
                if i == (int(sentenceLeng)-1):
                    break;
            text = text[:-1].lower()

            ratio = similar(text, rows[0])
            if ratio > maxNum:
                maxNum = ratio
                row = rows[1]

        if maxNum > 0.2:
            return maxNum, row
        else:
            return '',''

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_DOCUMENT_SENTENCE table select fail', 'error': str(e).replace("'", "").replace('"', '')}))

def selectOcrData(seqnum):
    try:
        selectOcrData = 'SELECT OCRDATA FROM TBL_BATCH_OCR_DATA WHERE SEQNUM=:seqnum'
        curs.execute(selectOcrData, {"seqnum": seqnum})
        rows = curs.fetchall()
        return rows[0][0]

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_BATCH_OCR_DATA table select fail',
                             'error': str(e).replace("'", "").replace('"', '')}))

def selectLabelDef(docId):
    try:
        selectOcrData = 'SELECT SEQNUM, DOCID, KORNM, ENGNM, LABELTYPE FROM TBL_ICR_LABEL_DEF WHERE DOCID=:docId'
        curs.execute(selectOcrData, {"docId": docId})
        rows = curs.fetchall()
        return rows

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'TBL_BATCH_OCR_DATA table select fail',
                             'error': str(e).replace("'", "").replace('"', '')}))

def selectLabelDefLabelType(seqnum):
    try:
        sql = 'SELECT SEQNUM, DOCID, KORNM, ENGNM, LABELTYPE FROM TBL_ICR_LABEL_DEF WHERE SEQNUM=:seqNum'
        curs.execute(sql, {"seqNum":seqnum})
        rows = curs.fetchall()

        if len(rows) == 0:
            return ''
        else:
            return rows[0][4]

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'getEntryLabelYN table select fail',
                             'error': str(e).replace("'", "").replace('"', '')}))

def checkVertical(entLoc, lblLoc):
    try:
        lblwidthLoc = (int(lblLoc[3]) + int(lblLoc[1])) / 2
        entwidthLoc = (int(entLoc[3]) + int(entLoc[1])) / 2
        # entryLabel이 오른쪽에서 가까울 경우 제외
        if -150 < entwidthLoc - lblwidthLoc < 180:
            return True
        else:
            return False

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'checkVerticalEntry fail',
                         'error': str(e).replace("'", "").replace('"', '')}))

def selectLabelBehaviorDrug(label, entryLabel):
    try:
        colLabel = label["colLbl"]
        lloc = label["location"].split(",")
        for entry in entryLabel:
            eloc = entry["location"].split(",")
            if abs(int(lloc[0]) - int(eloc[0])) < 150 and -30 < int(lloc[1]) - int(eloc[1]) < 50:
                if entry["colLbl"] == 138:
                    if colLabel == 136:
                        colLabel = 6
                    elif colLabel == 137:
                        colLabel = 7
                elif entry["colLbl"] == 139:
                    if colLabel == 136:
                        colLabel = 4
                    elif colLabel == 137:
                        colLabel = 5

        return colLabel
    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'selectLabelBehaviorDrug fail',
                         'error': str(e).replace("'", "").replace('"', '')}))

def selectLabelAmountPaid(label, entryLabel):
    try:
        colLabel = label["colLbl"]
        lloc = label["location"].split(",")
        for entry in entryLabel:
            eloc = entry["location"].split(",")
            if abs(int(lloc[0]) - int(eloc[0])) < 250 and -30 < int(lloc[1]) - int(eloc[1]) < 60:
                if entry["colLbl"] == 127:
                    colLabel = 127

        return colLabel
    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'selectLabelBehaviorDrug fail',
                         'error': str(e).replace("'", "").replace('"', '')}))

def typoSentence(ocrData, langDetect):
    try:
        initial_capacity = 83000
        max_edit_distance_dictionary = 2
        prefix_length = 7

        sym_spell = SymSpell(initial_capacity, max_edit_distance_dictionary,
                             prefix_length)

        if langDetect == "en":
            dictionary_path = os.path.join(os.path.dirname(__file__),
                                       "frequency_dictionary_en_82_765.txt")
        elif langDetect == "de":
            dictionary_path = os.path.join(os.path.dirname(__file__),
                                           "frequency_dictionary_de.txt")

        term_index = 0
        count_index = 1

        if not sym_spell.load_dictionary(dictionary_path, term_index, count_index):
            print("Dictionary file not found")
            return

        for item in ocrData:
            text = item["text"]
            text = text.split(" ")
            symText = ''

            for i in text:
                input_term = i

                max_edit_distance_lookup = 2
                suggestion_verbosity = Verbosity.TOP
                suggestions = sym_spell.lookup(input_term, suggestion_verbosity,
                                               max_edit_distance_lookup)

                if len(suggestions) > 0:
                    i = suggestions[0].term

                symText += i + " "

            item["text"] = symText

        return ocrData

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'typoSentence error',
                             'error': str(e).replace("'", "").replace('"', '')}))

def langDetect(ocrData):
    try:

        lang = ''
        text = ''

        for data in ocrData:
            text += data["text"]

        lang = detect(text)

        return lang

    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'langDetect error',
                             'error': str(e).replace("'", "").replace('"', '')}))

def findFixLabel(ocrData):
    try:
        fixLabelSql = "SELECT * FROM TBL_ICR_LABEL_DEF WHERE LABELTYPE = 'T'"
        curs.execute(fixLabelSql)
        fixLabelRows = curs.fetchall()

        label = []
        for row in fixLabelRows:
            label.append(row[0])

        # 고정 라벨 추출
        for item in ocrData:
            data = item["sid"]
            if data != ["1,1,1,1,1"]:
                trainSql = "SELECT SEQNUM, DATA, CLASS FROM TBL_BATCH_COLUMN_MAPPING_TRAIN WHERE DATA LIKE '%," + data + "%'"
                curs.execute(trainSql)
                trainRows = curs.fetchall()

                for row in trainRows:
                    for e in fixLabelRows:
                        if int(row[2]) in e:
                            item["colLbl"] = e[0]

        return ocrData
    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'findFixLabel error',
                             'error': str(e).replace("'", "").replace('"', '')}))

def getMappingSid(ocrData, docTopType):
    try:
        for item in ocrData:
            loc = item["location"].split(',')
            item["mappingSid"] = str(docTopType) + "," + str(loc[0]) + "," + str(loc[1]) + "," + str(
                int(loc[0]) + int(loc[2])) + "," + str(item["sid"])

        return ocrData
    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'getMappingSid error',
                             'error': str(e).replace("'", "").replace('"', '')}))


def findEntry(ocrData, docTopType, docType):
    try:
        if docType == 7:
            lineCheck = True
            for item in ocrData:
                if item["text"].lower == "line":
                    lineCheck = False
                    break

            if lineCheck:
                data = {'location':'182,1223,90,26','text':'LINE','originText':'LINE','sid':'99624,0,0,0,0','mappingSid':'37,182,1223,272,99624,0,0,0,0'}
                ocrData.append(data)

        elif docType == 6:
            serialCheck = True
            materialCheck = True
            quantityCheck = True
            unitPriceCheck = True
            reqDateCheck = True

            for item in ocrData:

                if item["text"].lower() == 'tem no'.lower() or item["text"].lower() == 'item no'.lower():
                    serialCheck = False
                if item["text"].lower() == 'Item Code'.lower():
                    materialCheck = False
                if item["text"].lower() == 'Quantity'.lower():
                    quantityCheck = False
                if item["text"].lower() == 'Unit Price'.lower():
                    unitPriceCheck = False
                if item["text"].lower() == 'Delivery Date'.lower():
                    reqDateCheck = False

            if serialCheck:
                data = {'location': '341,1274,107,24', 'text': 'Item No', 'originText': 'tem No', 'sid': '99798,97435,0,0,0', 'mappingSid': '37,341,1274,448,99798,97435,0,0,0'}
                ocrData.append(data)
            if materialCheck:
                data = {'location': '517,1274,152,24', 'text': 'Item Code', 'originText': 'Item Code', 'sid': '99798,99596,0,0,0', 'mappingSid': '37,517,1274,669,99798,99596,0,0,0'}
                ocrData.append(data)
            if quantityCheck:
                data = {'location': '1554,1272,127,30', 'text': 'Quantity', 'originText': 'Quantity', 'sid': '99588,0,0,0,0','mappingSid': '37,1554,1272,1681,99588,0,0,0,0'}
                ocrData.append(data)
            if unitPriceCheck:
                data = {'location': '1807,1272,146,23', 'text': 'Unit Price', 'originText': 'Unit Price', 'sid': '99587,99507,0,0,0', 'mappingSid': '37,1807,1272,1953,99587,99507,0,0,0'}
                ocrData.append(data)
            if reqDateCheck:
                data = {'location': '2051,1271,200,30', 'text': 'Delivery Date', 'originText': 'Delivery Date', 'sid': '99552,97436,0,0,0', 'mappingSid': '37,2051,1271,2251,99552,97436,0,0,0'}
                ocrData.append(data)
        elif docType == 5:
            for item in ocrData:
                if item["text"].lower() == "date":
                    mappingSid = item["mappingSid"].split(",")
                    for entry in ocrData:
                        entrySid = entry["mappingSid"].split(",")

                        if abs( int(mappingSid[1]) - int(entrySid[1]) )  < 50 and abs( int(mappingSid[2]) - int(entrySid[2]) )  < 50 and 'delivery' in entry["text"].lower():
                            item["text"] = "Delivery Date"
                            item["colLbl"] = "230"
                            ocrData = getSid(ocrData)
                            ocrData = getMappingSid(ocrData,docTopType)
                            break
                    break

        elif docType == 4:
            mValid = re.compile("77[0-9]* [a-zA-Z]{1,7}")
            eValid = re.compile("[0-9a-zA-Z.,;()/+-]* 88[0-9]*")
            for item in ocrData:
                if mValid.match(item["text"]):
                    text = item["text"].split(" ")
                    location = item["location"].split(",")

                    item["text"] = text[0]
                    item["location"] = location[0] + "," + location[1] + "," + str(int(int(location[2]) / 2)) + "," + location[3]

                    toData = {"location":str(int(location[0]) + (int(int(location[2]) / 2))) + "," + location[1] + "," + str(int(int(location[2]) / 2)) + "," + location[3],
                              "text": " ".join(text[1:]),
                              "originText":item["originText"],
                              "sid":item["sid"],
                              "mappingSid":item["mappingSid"]}

                    ocrData.append(toData)

                elif eValid.match(item["text"]):
                    text = item["text"].split(" ")
                    location = item["location"].split(",")

                    item["text"] = text[0]
                    item["location"] = location[0] + "," + location[1] + "," + str(int(int(location[2]) / 2)) + "," + location[3]

                    toData = {"location":str(int(location[0]) + (int(int(location[2]) / 2))) + "," + location[1] + "," + str(int(int(location[2]) / 2)) + "," + location[3],
                              "text":text[1],
                              "originText":item["originText"],
                              "sid":item["sid"],
                              "mappingSid":item["mappingSid"]}

                    ocrData.append(toData)

            ocrData = getSid(ocrData)
            ocrData = getMappingSid(ocrData, docTopType)

        labelSql = "SELECT * FROM TBL_ICR_LABEL_DEF WHERE DOCID = :docid"
        curs.execute(labelSql, {"docid":str(docTopType)})
        labelRows = curs.fetchall()

        subLabel = []
        fixSingleLabel = []
        fixMultiLabel = []

        for labelRow in labelRows:
            if labelRow[4] == 'T' and labelRow[5] == 'submulti':
                subLabel.append(labelRow[0])
            elif labelRow[4] == 'T' and labelRow[5] == 'multi':
                fixMultiLabel.append(labelRow[0])
            elif labelRow[4] == 'T' and labelRow[5] == 'single':
                fixSingleLabel.append(labelRow[0])

        fixLabel = []
        for labelRow in labelRows:
            if labelRow[4] == 'T':
                fixLabel.append(labelRow[0])

        variLabel = []
        for labelRow in labelRows:
            if labelRow[4] == 'P':
                variLabel.append(labelRow[0])

        trainSql = "SELECT * FROM TBL_BATCH_COLUMN_MAPPING_TRAIN WHERE data LIKE '" + str(docTopType) + "%'"
        curs.execute(trainSql)
        trainRows = curs.fetchall()

        # label Mapping
        for item in ocrData:
            mappingSid = item["mappingSid"].split(",")

            for trainRow in trainRows:
                trainData = trainRow[1].split(",")

                # fix Label mapping
                if mappingSid[4:] == trainData[4:] and int(trainRow[2]) in fixLabel:
                    item["colLbl"] = trainRow[2]
                # variable Label mapping
                # 문서종류 and (Y좌표 뭉 (X좌표 or 넓이))
                if (mappingSid[0] == trainData[0]) and int(trainRow[2]) in variLabel and (boundaryCheck(mappingSid[2], trainData[2]) and (boundaryCheck(mappingSid[1], trainData[1]) or boundaryCheck(mappingSid[3], trainData[3]))):
                    valid = ""
                    for labelRow in labelRows:
                        if int(labelRow[0]) == int(trainRow[2]):
                            valid = labelRow[6]

                    p = re.compile(valid)

                    if p.match(item["text"]):
                        item["entryLbl"] = trainRow[2]
                elif docType == 4 and  (mappingSid[0] == trainData[0]) and int(trainRow[2]) == 227 and boundaryCheck(mappingSid[1], trainData[1]) and boundaryCheck(mappingSid[3], trainData[3]):
                    valid = ""
                    for labelRow in labelRows:
                        if int(labelRow[0]) == int(trainRow[2]):
                            valid = labelRow[6]

                    p = re.compile(valid)

                    if p.match(item["text"]):
                        item["entryLbl"] = trainRow[2]

        # subMulti entry 추출
        for item in ocrData:
            mappingSid = item["mappingSid"].split(",")

            # subMulti label
            if "colLbl" in item and  int(item["colLbl"]) in subLabel:
                valid = ""
                for labelRow in labelRows:
                    if int(labelRow[0]) == int(item["colLbl"]):
                        valid = labelRow[6]

                # subMulti entry
                for entry in ocrData:
                    entrySid = entry["mappingSid"].split(",")
                    p = re.compile(valid)
                    # 정규식 검사 and y축 검사
                    if p.match(entry["text"]) and checkVertical(entrySid, mappingSid):
                        entry["subEntryLbl"] = item["colLbl"]

        # multi entry 추출
        for item in ocrData:
            mappingSid = item["mappingSid"].split(",")
            preVerticalLoc = int(mappingSid[2]);
            materialCheck = 1

            # multi label
            if "colLbl" in item and int(item["colLbl"]) in fixMultiLabel:
                valid = ""
                for labelRow in labelRows:
                    if int(labelRow[0]) == int(item["colLbl"]):
                        valid = labelRow[6]

                # multi entry
                for entry in ocrData:
                    entrySid = entry["mappingSid"].split(",")
                    p = re.compile(valid)

                    if p.match(entry["text"]) and checkVertical(entrySid, mappingSid) and int(mappingSid[2]) -15 < int(entrySid[2]) and "colLbl" not in entry and item["text"] != entry["text"]:

                        if not (int(entrySid[2]) - preVerticalLoc > 500) and "entryLbl" not in entry:

                            if docType == 7 and int(item["colLbl"]) == 228:
                                if materialCheck == 1:
                                    if not re.search(" ", entry["text"]):
                                        entry["entryLbl"] = item["colLbl"]
                                        materialCheck += 1
                                    else:
                                        break
                                elif materialCheck == 2:
                                    if re.search(" ", entry["text"]):
                                        materialCheck -= 1
                            elif docType == 4 and int(item["colLbl"]) == 228:
                                t = re.compile("^[0-9| |.|,]*$")
                                if t.match(entry["text"]):
                                    entry["entryLbl"] = item["colLbl"]
                            else :
                                entry["entryLbl"] = item["colLbl"]

                            preVerticalLoc = int(entrySid[2])

        # single entry 추출
        for item in ocrData:
            mappingSid = item["mappingSid"].split(",")
            distance = 3000

            # single label
            if "colLbl" in item and int(item["colLbl"]) in fixSingleLabel:
                valid = ""
                for labelRow in labelRows:
                    if int(labelRow[0]) == int(item["colLbl"]):
                        valid = labelRow[6]

                # label 에서 가장 가까운 entry distance 측정
                for entry in ocrData:
                    entrySid = entry["mappingSid"].split(",")

                    dx = int(entrySid[1]) - int(mappingSid[1])
                    dy = int(entrySid[2]) - int(mappingSid[2])

                    # label과 entry 거리 측정
                    entryDistance = math.sqrt((dx * dx) + (dy * dy))

                    p = re.compile(valid)

                    # (정규식) and (거리) and (label 보다 낮은 위치 검사) and (자신의 label 제외)
                    if p.match(entry["text"]) and distance > entryDistance and int(mappingSid[2]) - 20 < int(entrySid[2]) and item["text"] != entry["text"]:

                        if docType == 4:
                            if "colLbl" not in entry and (boundaryCheck(mappingSid[2], entrySid[2]) or checkVertical(entrySid,mappingSid)):
                                distance = entryDistance
                        else:
                            if "colLbl" not in entry:
                                distance = entryDistance

                # 가장 가까운 entry mapping
                for entry in ocrData:
                    entrySid = entry["mappingSid"].split(",")

                    dx = int(entrySid[1]) - int(mappingSid[1])
                    dy = int(entrySid[2]) - int(mappingSid[2])

                    entryDistance = math.sqrt((dx * dx) + (dy * dy))

                    if entryDistance == distance:
                        entry["entryLbl"] = item["colLbl"]

        for item in ocrData:
            if "colLbl" not in item and "entryLbl" not in item:
                item["colLbl"] = -1

        return ocrData
    except Exception as e:
        raise Exception(str({'code': 500, 'message': 'findFixLabel error',
                             'error': str(e).replace("'", "").replace('"', '')}))

# 문서양식 추출 함수
def findDocType(ocrData):
    try:
        # document sentence 테이블 검색
        docSentenceSql = "SELECT DATA, DOCTYPE, SENTENCELENGTH FROM TBL_DOCUMENT_SENTENCE"
        curs.execute(docSentenceSql)
        docSentenceRows = curs.fetchall()

        maxNum = 0
        row = ''
        docSentence = []
        for row in docSentenceRows:
            docSentence.append(row[1])

        # colLbl 값 검색 후 text 추출 및 sort
        text = []
        strText = ''
        for item in ocrData:
            for k, v in item.items():
                if k == "colLbl":
                    if v > 1:
                        print('{}:{}'.format(k, v))
                        text.append(item["text"])
                        text.sort()
                        strText = ",".join(str(x) for x in text)

        #print(text)
        #print(strText)
        #print(docSentence)

        for rows in docSentenceRows:
            ratio = similar(strText, rows[0])
            if ratio > maxNum:
                maxNum = ratio
                row = rows[1]

        if maxNum > 0.2:
            return row
        else:
            return ''

    except Exception as ex:
        raise Exception(str({'code': 500, 'message': 'findDocType error',
                             'error': str(ex).replace("'", "").replace('"', '')}))

def findDocTopType(ocrData):
    try:
        docTopType = 0
        docType = 0

        sql = "SELECT * FROM TBL_DOCUMENT_SENTENCE"
        curs.execute(sql)
        sentenceRows = curs.fetchall()


        for sentenceRow in sentenceRows:
            data = sentenceRow[1]

            for item in ocrData:
                text = re.sub(" |-|\(|\)", "", item["text"])

                if data.lower() == text.lower():
                    docType = int(sentenceRow[2])
                    break

            if docType > 0:
                break

        if docType > 0:
            docTopTypeSql = "SELECT * FROM TBL_DOCUMENT_CATEGORY WHERE DOCTYPE = :doctype"
            curs.execute(docTopTypeSql,{"doctype":docType})
            docTopTypeRows = curs.fetchall()
            docTopType = docTopTypeRows[0][4]

        return docTopType, docType
    except Exception as ex:
        raise Exception(str({'code': 500, 'message': 'findDocType error',
                             'error': str(ex).replace("'", "").replace('"', '')}))


def findDelivery(ocrData):
    try:
        for item in ocrData:
            if "entryLbl" in item and int(item["entryLbl"]) == 224:
                if item["text"].lower() == "Exertis Warehouse (Altham)".lower() or item["text"].lower() == "Exert is Warehouse (Alt ham)".lower()  or item["text"].lower() == "Exert 1 s Warehouse (Al t ham)".lower() :
                    item["text"] =  "Exertis Warehouse (Altham) Shorten Brook Way Altham Business Park Altham Accrington, Lancashire, BB5 5YJ United Kingdom"
                elif item["text"].lower() == "WESTCOAST MK LTD".lower():
                    item["text"] = "WESTCOAST MK LTD EMERALD GATE FOX MILNE TONGWELL STREET MILTON KEYNES MK15 0SF"
                elif item["text"].lower() == "MVN Betrieb Neuendorf".lower():
                    item["text"] = "MVN Betrieb Neuendorf 4623 Neuendorf"
                elif item["text"].lower() == "Blue Orange IT Ltd".lower():
                    item["text"] = "Blue Orange IT Ltd Rainbow House Railway Road ADLINGTON CHORLEY PR6 9RB"
                elif item["text"].lower() == "Midwich Ltd c/o Kuehne + Nagel(Goods In)".lower():
                    item["text"] = "Midwich Ltd c/o Kuehne + Nagel(Goods In) DC3 Prologis Park Midpoint Way Minworth SUTTON COLDFIELD BIRMINGHAM B76 9EH"
                elif item["text"].lower() == "Westcoast Limited".lower():
                    item["text"] = "Westcoast Limited Arrowhead Park Arrowhead Road Theale READING Berkshire RG7 4AH"
                elif item["text"].lower() == "MVN - Betrieb Neuendorf".lower():
                    item["text"] = "MVN Betrieb Neuendorf 4623 Neuendorf"
                elif item["text"].lower() == "Exert is Warehouse (Altham)".lower():
                    item["text"] = "Exertis Warehouse (Altham) Shorten Brook Way Altham Business Park Altham Accrington, Lancashire, BB5 5YJ United Kingdom"
                elif item["text"].lower() == "Vohkus Ltd".lower():
                    item["text"] = "Vohkus Ltd Centurion House Unit 12 Barnes Wallis Road SEGENSWORTH Hampshire PO15 5TT"
                elif item["text"].lower() == "The Saville Group Limited".lower():
                    item["text"] = "The Saville Group Limited The Saville Group Limited Fourth Avenue Trafford Park MANCHESTER M17 1DB"
                elif item["text"].lower() == "ISDM Solutions Ltd".lower():
                    item["text"] = "ISDM Solutions Ltd G437 GMill Dean Clough HALIFAX WEST YORKSHIRE HX3 5AX"
                elif item["text"].lower() == "Comcen Computer Supplies Ltd".lower():
                    item["text"] = "Comcen Computer Supplies Ltd Bruce Road Swansea Industrial Estate Fforestfach SWANSEA WEST GLAMORGAN SA5 4HS"
                elif item["text"].lower() == "Butterfield Signs Ltd".lower():
                    item["text"] = "Butterfield Signs Ltd 174 Sunbridge Road BRADFORD WEST YORKSHIRE BD1 2RZ"
                elif item["text"].lower() == "Unit Al 5".lower():
                    item["text"] = "UnitA15 Big Yellow Storage 1A Rugby Road TWICKENHAM LONDON TW1 1DG"
                elif item["text"].lower() == "Keter UK Ltd".lower():
                    item["text"] = "Keter UK Ltd West Point Mucklow Hill Halesowen Birmingham B62 8DY"
                elif item["text"].lower() == "The Fragrance Shop".lower():
                    item["text"] = "The Fragrance Shop Unit 43 The Chantry Centre Andover SP10 1RN"
                elif item["text"].lower() == "Ericsson".lower():
                    item["text"] = "Ericsson C/o Overbury Site Office 8th Floor (Elite AV) Thames Tower Station Road Reading RG1 1LX"
                elif item["text"].lower() == "TSYS CARD TECH SERVICES LTD".lower():
                    item["text"] = "TSYS CARD TECH SERVICES LTD 4 Verginas Street Annex 4 Building Nicosia Strovolos, 2030 Cyprus"
                elif item["text"].lower() == "SUB TV".lower():
                    item["text"] = "SUB TV A15 BIG YELLOW STORAGE 1A RUGBY ROAD TWICKENHAM TW1 1DG"

        return ocrData
    except Exception as ex:
        raise Exception(str({'code': 500, 'message': 'findDocType error',
                             'error': str(ex).replace("'", "").replace('"', '')}))



def findCurrency(ocrData):
    try:
        for item in ocrData:
            if "entryLbl" in item and int(item["entryLbl"]) == 227:
                if item["text"].lower() == "Value GBP".lower() or item["text"].lower() == "GAP".lower():
                    item["text"] =  "GBP"
                #elif item["text"].lower() == "WESTCOAST MK LTD".lower():
                #    item["text"] = "WESTCOAST MK LTD EMERALD GATE FOX MILNE TONGWELL STREET MILTON KEYNES MK15 0SF"

        return ocrData
    except Exception as ex:
        raise Exception(str({'code': 500, 'message': 'findCurrency error',
                             'error': str(ex).replace("'", "").replace('"', '')}))

def requestML(ocrData):
    data = {
        "Inputs": {
        },
        "GlobalParameters": {
        }
    }

    body = str.encode(json.dumps(data))

    url = 'https://ussouthcentral.services.azureml.net/workspaces/2fe3537ce3444ca393232350f4305538/services/e3435bf4201e4d59825751de4332a9f5/execute?api-version=2.0&format=swagger'
    api_key = 'H95TSIp0dMEYy6fiz0Rfrg/MCR5PgGqdSDfDKT0QQGhqRuzIRr6reb5JfvbB2BnAWrsNEZJC4pUOOsCBF2tDFQ=='  # Replace this with the API key for the web service
    headers = {'Content-Type': 'application/json', 'Authorization': ('Bearer ' + api_key)}

    req = urllib.request.Request(url, body, headers)

    try:
        response = urllib.request.urlopen(req)

        result = response.read()

    except urllib.request.HTTPError as error:
        print("The request failed with status code: " + str(error.code))

        # Print the headers - they include the requert ID and the timestamp, which are useful for debugging the failure
        print(error.info())
        print(json.loads(error.read()))
