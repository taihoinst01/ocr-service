import sys
import os
import subprocess
import PIL.Image as Image
import http.client, urllib.request, urllib.parse, urllib.error, base64
import json
import operator
import timeit
import re
import math
import cv2
import numpy as np
from glob import glob
from difflib import SequenceMatcher
from pdf2image import convert_from_path, convert_from_bytes

def insertDocSentence(str):

    print(str)
    # file = open('./ml/ColumnMapping/docSentence1.txt', 'a')
    # fileName = "C:/Users/taiho/source/repos/taihoinst01/ocr-service/ml/ColumnMapping/docSentence1.txt"
    # file = open(fileName, "a", -1, "UTF8")
    file = open("./ml/ColumnMapping/docSentence.txt", "a", -1, encoding="UTF8")
    # file = open('./ml/ColumnMapping/docSentence.txt1', 'r', encoding="UTF8")
    # for line in file:
    #     sentence, type, topType = line.strip().split("||")
    #     print(sentence)
    #     print(type)
    #     print(topType)
    #
    # file.close()
    file.write('\n')
    file.write(str)
    file.close()

    return "ok"

if __name__ == '__main__':
    try:
        retResult = []
        sentence = ""
        insertStr = ""
        regExp = "[\{\}\[\]\/?.;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]"

        data = sys.argv[1]
        # print(data)
        # data = ["57", "141", [{"text": "I\iC)RCO 거래명세서(거래선용)"}, {"text": "발행일자 2018-10-04 14:48:19"}, {"text": "부서명"},
        #                       {"text": "서울지점"}, {"text": "거래선전화"},{"text": "E0710"}, {"text": "02-6401-7157"},
        #                       {"text": "영업사원"}, {"text": "이강빈"}, {"text": "010-8646-3196"}, {"text": "진 명 호 ,(•-국가"}]]

        # print(data[0])
        # print(data[1])
        # print(data[2])

        # for rows in json.dumps(data[2]):
        #     sentence = sentence + rows["text"] + ","

        # print(sentence)
        # print(re.sub(regExp, "",sentence))

        # insertStr = re.sub(regExp, "",data)

        # print(insertStr)

        obj = insertDocSentence(data)

        retResult.append(obj)

        print(retResult)

        result = re.sub('None', "null", json.dumps(retResult, ensure_ascii=False))
        print(base64.b64encode(result.encode('utf-8')))

    except Exception as e:
        print(e)


