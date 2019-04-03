var propertiesConfig = {
    common: {

    },
    proxy: {
        serverUrl: 'http://210.109.27.111:8888'
    },
    icrRest: {
        serverUrl: 'http://52.141.34.200:5000'
    },
    uiLearning: {

    },
    batchLearning: {

    },
    ocr: {
        uri: 'https://japaneast.api.cognitive.microsoft.com/vision/v1.0/ocr',
        subscriptionKey: 'b54aa37a89f943258a782bf900f0f531',
    },
    filepath: {
        uploadsPath: 'C:\\ICR\\uploads\\',
        //develop
        logfilepath: 'c:/logs',
        //realExcelPath: 'C:\\Users\\Taiho\\Desktop\\labeled_data',
        //product
        //logfilepath: 'c:/logs'

        //excelBatchFilePath: '/ICR/labeled_data/filepath_mapping_20180720.xlsx',
        //excelBatchFileData: '/ICR/labeled_data/labeled_data_20180723.xlsx',
        //realExcelPath: '/image/labeled_data',
        //imagePath: '/ICR/image'

        excelBatchFilePath: 'C:\\ICR\\labeled_data\\filepath_mapping_20180720.xlsx',
        excelBatchFileData: 'C:\\ICR\\labeled_data\\labeled_data_20180723.xlsx',
        realExcelPath: 'C:\\ICR\\labeled_data',
        imagePath: 'C:\\ICR\\image',
        convertedImagePath: 'C:\\ICR\\convertedImage',
        createImgDirPath: '/ICR/image',
        createImgconvertedDirPath: '/ICR/convertedImage',
        answerFileFrontPath: 'C:/ICR/image/MIG/MIG',
        docFilePath: 'C:/ICR/sampleDocImage',
        doc_sampleImagePath: 'C:/ICR',
        excelUploadPath: 'C:\\ICR\\uploads\\excel\\'
    }
};

module.exports = propertiesConfig;

