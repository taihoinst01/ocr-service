import sys
import json

def addsplitLabelText(newTextList):
    f = open('./ml/ColumnMapping/splitLabel.txt', 'a', encoding="utf-8")
    for item in newTextList:
        f.write("\n" + item)
    f.close()

if __name__ == '__main__':
    try:
        newText = sys.argv[1]
        newTextList = json.loads(newText)
        addsplitLabelText(newTextList)
 
    except Exception as e:
        print(e)