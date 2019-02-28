var progressId; // progress Id
var g_ocrResultList;
$(function () {
    _init();   
});

/****************************************************************************************
 * INIT
 ****************************************************************************************/
var _init = function () {
    $('.editSelect').stbDropdown();
    fn_uploadFileEvent();
    fn_templateSave();
};

/****************************************************************************************
 * FILE UPLOAD EVENT
 ****************************************************************************************/
var fn_uploadFileEvent = function () {


    $("#uploadFile").change(function () {
        if ($(this).val() !== "") {
            $('#uploadFileForm').submit();
        }
    });

    $("#uploadFile").click(function(e){
        $("#uploadFile").val('');
        e.stopPropagation();
    });

    $('#uploadFileForm').ajaxForm({
        beforeSubmit: function (data, frm, opt) {
            fn_initUpload();
            $("#progressMsgTitle").html('파일 업로드 중..');
            progressId = showProgressBar();
            return true;
        },
        success: function (data) {
            $("#progressMsgTitle").html('파일 업로드 완료..');
            if(data.status == 200) {
                imgOcr(data.fileInfoList);
                console.log(data.fileInfoList);
            } else {
                console.log('error');
            }

            // 문서 기본 정보 처리
            // fn_processBaseImage(responseText.fileInfo);


        },
        error: function (e) {
            endProgressBar(progressId);
            //console.log(e);
        }
    });
    
    var imgOcr = function(fileInfoList) {
        var param = {'fileInfoList': fileInfoList};
        $.ajax({
            url: '/templateRegistration/imgOcr',
            type: 'post',
            datatype: "json",
            contentType: 'application/json; charset=UTF-8',
            data: JSON.stringify(param),
            beforeSend: function () {
                $("#progressMsgTitle").html("Ocr ...");
            },
            success: function (data) {
                console.log(data);
                if(data.status == 200) {
                    g_ocrResultList = data.ocrResultList;
                    var docToptypeList = data.docToptypeList;
                    var docLabelDefList = data.docLabelDefList;
                    var docCategory = data.ocrResultList[0].docCategory;
                    fn_docClassification(docCategory, docToptypeList);

                    var appendimgHtmlList = [];
                        
                    var reImg = new Image();
                    reImg.src = '/img/' + g_ocrResultList[0].fileName;
                    var mainImg = '<div id="mainImage" style="width:100%; height:100%;">';

                    $('#div_invoice_view_image_2').html(mainImg);
                    $('#mainImage').css('background-image', 'url("' + reImg.src + '")');

                    fn_makeThumbnail(g_ocrResultList);                
                    thumbImgEvent() // 썸네일 클릭 이벤트
                    reImg.onload = function() {

                        var fixWidth = 861;
                        var fixHeight = 746;
                        var widthPercent;
                        var heightPercent;
    
                        var width = reImg.width;
                        var height = reImg.height;
                    
                    
                        widthPercent = fixWidth / width;
                        heightPercent = fixHeight / height;
    
                        var canvas = document.createElement('canvas');
                        canvas.id = "myCanvas";
                        
                        canvas.width = fixWidth;
                        canvas.height = fixHeight;
 
                        var ctx = canvas.getContext("2d");
                        $('#canversDiv').append(canvas);
    
                        
                        for(var i = 0; i < g_ocrResultList[0].ocrTextList.length; i++) {
    
                            var location = g_ocrResultList[0].ocrTextList[i].location.split(',');
                            var text = g_ocrResultList[0].ocrTextList[i].text;
                            ctx.strokeText(text, (location[0] * widthPercent), (location[1] * heightPercent));
                        }
                        var img = canvas.toDataURL('image/png');
                        $('canvas').remove();
                        var appendImgHtml = '<img src="' + img + '" class="imgCnt_0">';
                        $('#ocrTextImgDiv').append(appendImgHtml).addClass('on');
                        $('#ocrTextImgDiv .imgCnt_0').selectAreas({
                        
                        });
                        fn_areaHoverToolTip();

                    }
                } else {
                    fn_alert('alert', 'error');
                }
                endProgressBar(progressId);
            }      
        })
    }
 
    var fn_makeThumbnail = function (ocrResultList) {
        var thumbnailImgHtml = '';

        for(var i = 0; i < ocrResultList.length; i++) {
            var ocrResult = ocrResultList[i];
            var fileName = ocrResult.fileName;
            if(i == 0) {
                thumbnailImgHtml += '<li class="on">';
            } else {
                thumbnailImgHtml += '<li>';
            }

            thumbnailImgHtml += '<div class="box_img"><i><img src="/img/' + nvl(fileName) + '" ' +
                    'class="thumb-img" title="' + nvl(fileName) + '" data-imgCnt="' + i +'"></i>' +
                    '</div>' +
                    '<span>' + nvl(fileName) + '</span>' +
                    '</li> ';
        }
        $("#imageBox").empty().append(thumbnailImgHtml);
    }

    // 썸네일 이미지 클릭 이벤트
    function thumbImgEvent() {
        $(document).on('click','.thumb-img', function () {
            var changeBeforeImgCnt = $('#imageBox > li.on').find('img').attr('data-imgCnt');
            $('#ocrTextImgDiv .imgCnt_' + changeBeforeImgCnt).closest('div').css('display', 'none');

            $('#imageBox > li').removeClass('on');
            $(this).parent().addClass('on');

            
            $('#mainImage').css('background-image', 'url("/img/' + $(this).attr('title') + '")');

            $(this).parents('imageBox').find('li').removeClass('on');
            $(this).parents('li').addClass('on');
            $('#touchSlider').scrollTop($(this)[0].offsetTop - 12);

            
            //
            var imgCnt = $(this).attr('data-imgCnt');
            var hasImg = $('#ocrTextImgDiv').find('.imgCnt_' + imgCnt).length;
            if(!hasImg) {
                $("#progressMsgTitle").html('ocr 결과 그리는 중..');
                progressId = showProgressBar();
                
                var reImg = new Image();
                reImg.src = '/img/' + $(this).attr('title');

                reImg.onload = function() {

                    var fixWidth = 861;
                    var fixHeight = 746;
                    var widthPercent;
                    var heightPercent;

                    var width = reImg.width;
                    var height = reImg.height;
                
                    widthPercent = fixWidth / width;
                    heightPercent = fixHeight / height;

                    var canvas = document.createElement('canvas');
                    canvas.id = "myCanvas";
                    
                    canvas.width = fixWidth;
                    canvas.height = fixHeight;

                    var ctx = canvas.getContext("2d");
                    $('#canversDiv').append(canvas);
                    
                    for(var i = 0; i < g_ocrResultList[imgCnt].ocrTextList.length; i++) {

                        var location = g_ocrResultList[imgCnt].ocrTextList[i].location.split(',');
                        var text = g_ocrResultList[imgCnt].ocrTextList[i].text;
                        ctx.strokeText(text, (location[0] * widthPercent), (location[1] * heightPercent));
                    }

                    var img = canvas.toDataURL('image/png');
                    $('canvas').remove();
                    var appendImgHtml = '<img src="' + img + '" class="imgCnt_' + imgCnt +'">';
                    $('#ocrTextImgDiv').append(appendImgHtml).addClass('on');
                    $('#ocrTextImgDiv .imgCnt_' + imgCnt).selectAreas({
                    
                    });
                    endProgressBar(progressId);

                }
            } else {
                $('#ocrTextImgDiv .imgCnt_' + imgCnt).closest('div').show();
            }
        });
    }
    var fn_initUpload = function () {
        $('#ocrTextImgDiv').empty().removeClass('on');
    }
    
    var fn_docClassification = function(docCategory, docToptypeList) {
        var docToptype = docCategory.DOCTOPTYPE;
        var docType = docCategory.DOCTYPE;

        var appendToptypeSelectHtml = '';
        for(var i = 0; i < docToptypeList.length; i++) {
            if(docToptype == docToptypeList[i].SEQNUM) {
                appendToptypeSelectHtml += '<option value="' + docToptypeList[i].SEQNUM + '" selected>' + docToptypeList[i].ENGNM + '</option>';
                $('#docToptype').prev().text(docToptypeList[i].ENGNM);
                fn_selectDocTypeList(docToptype, docType);
                fn_selectDocLabelDefList(docToptype);
            } else {
                appendToptypeSelectHtml += '<option value="' + docToptypeList[i].SEQNUM + '">' + docToptypeList[i].ENGNM + '</option>';
            }
        }
        $('#docToptype').empty().append(appendToptypeSelectHtml);
        changeDocToptype();
          
    }

    var fn_areaHoverToolTip = function() {
        var style = document.createElement('style');
        document.head.appendChild(style);
    
        var matchingElements = [];
        var allElements = document.getElementsByTagName('*');
        for (var i = 0, n = allElements.length; i < n; i++) {
            var attr = allElements[i].getAttribute('data-tooltip');
            if (attr) {
                allElements[i].addEventListener('mouseover', hoverEvent);
            }
        }
    
        function hoverEvent(event) {
            event.preventDefault();
            x = event.x - this.offsetLeft;
            y = event.y - this.offsetTop;
            console.log(this);
            // Make it hang below the cursor a bit.
            y += 10;
    
            style.innerHTML = '*[data-tooltip]::after { left: ' + x + 'px; top: ' + y + 'px  }'
            console.log(this);
        }
    }
};

var fn_selectDocTypeList = function(docToptype, docType) {
    $.ajax({
        url: '/templateRegistration/selectDocTypeList',
        type: 'post',
        datatype: "json",
        data: JSON.stringify({ 'docToptype': docToptype}),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {

        },
        success: function (data) {
            var docTypeList = data.docTypeList;
            var docName =  '';
            var appendDoctypeSelectHtml = '';

            if(docTypeList.length > 0) {

                for(var i = 0; i < docTypeList.length; i++) {
                    if(docType == docTypeList[i].DOCTYPE) {
                        appendDoctypeSelectHtml += '<option value="' + docTypeList[i].DOCTYPE + '" selected>' + docTypeList[i].DOCNAME + '</option>';
                    } else {
                        appendDoctypeSelectHtml += '<option value="' + docTypeList[i].DOCTYPE + '">' + docTypeList[i].DOCNAME + '</option>';
                    }
                }
                if(docName != '') {
                    $('#docType').prev().text(docName);
                } else {
                    $('#docType').prev().text(docTypeList[0].DOCNAME);
                }
                $('#docType').empty().append(appendDoctypeSelectHtml);
            } else {
                $('#docType').empty().append('<option>unknown</option>');
                $('#docType').prev().text('unknown');
            }

        },
        error: function (err) {
            console.log(err);
        }
    });
}

var fn_selectDocLabelDefList = function(docToptype) {
    $.ajax({
        url: '/templateRegistration/selectDocLabelDefList',
        type: 'post',
        datatype: "json",
        data: JSON.stringify({ 'docToptype': docToptype}),
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {

        },
        success: function (data) {
            var docLabelList = data.docLabelList;

            var appendDoctypeSelectHtml = '';
            for(var i = 0; i < docLabelList.length; i++) {
                appendDoctypeSelectHtml += '<option value="' + docLabelList[i].SEQNUM + '_' + docLabelList[i].ENGNM + '">' + docLabelList[i].ENGNM + '</option>';
            }
            $('#docLabel').prev().text(docLabelList[0].ENGNM);
            $('#docLabel').empty().append(appendDoctypeSelectHtml);
            endProgressBar(progressId);
        },
        error: function (err) {
            console.log(err);
            endProgressBar(progressId);
        }
    });
}

var changeDocToptype = function() {
    $('#docToptype').on('change', function(){
        var docToptype = $(this).val();
        fn_selectDocTypeList(docToptype);
        fn_selectDocLabelDefList(docToptype);
        $('#ocrTextImgDiv img').each(function(){
            $(this).selectAreas('reset');
        })
    })
}

var fn_templateSave = function() {

    $('#saveBtn').on('click', function() {  
        $('#ocrTextImgDiv img').each(function(){
            var areas = $(this).selectAreas('areas');
            displayAreas(areas);    
        });
        
    })

    // Display areas coordinates in a div
    function displayAreas (areas) {
        var text = "";
        $.each(areas, function (id, area) {
            text += areaToString(area);
        });
        output(text);
    };

    function areaToString (area) {
        return (typeof area.id === "undefined" ? "" : (area.label + ": ")) + area.x + ':' + area.y  + ' ' + area.width + 'x' + area.height + '  ::::  ';
    }
    
    function output (text) {
        console.log(text);
    }
}