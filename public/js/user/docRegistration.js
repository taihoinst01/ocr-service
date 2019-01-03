"use strict";

var progressId; // progress Id
var deleteList = []; // 문서등록 테이블 행 삭제시 seq번호 저장

$(function () {
    _init();
    
});


$(document).on('change', '#docToptype', function(){
    var docToptype = $(this).val();
    //console.log(docToptype);

    // 문서타입 신규 클릭시
    if(docToptype == 0) {
        $('.newDocEdit').show();
    } else {
        $('.newDocEdit').hide();
    }
    fn_selectDocList(docToptype);
})

function fn_selectDocTopType(docToptype) {
    $.ajax({
        url: '/docRegistration/selectDocTopType',
        type: 'post',
        datatype: "json",        
        contentType: 'application/json; charset=UTF-8',
        beforeSend: function () {
            $('#docToptype').empty();
            $('.newDocEdit').hide();
            $("#progressMsgTitle").html("Search DocList...");
            progressId = showProgressBar();
        },
        success: function (data) {
            //console.log(data);
            var appendOptionHtml = '';
            if(data) {
                var docToptypeList = data.docToptypeList;
                var docToptypeListLength = docToptypeList.length;

                appendOptionHtml += '<option value="0">신규</option>';

                if(docToptypeListLength > 0) {

                    for(var i = 0; i < docToptypeListLength; i++) {
                        if(docToptype) {
                            appendOptionHtml += '<option value="' + docToptypeList[i].SEQNUM + '"' + (docToptype == docToptypeList[i].SEQNUM ? 'selected' : '') + '>' + docToptypeList[i].ENGNM + '</option>';
                        } else {
                            appendOptionHtml += '<option value="' + docToptypeList[i].SEQNUM + '"' + (i == 0 ? 'selected' : '') + '>' + docToptypeList[i].ENGNM + '</option>';
                        }
                    }
                }

                $('#docToptype').append(appendOptionHtml);
                fn_selectDocList($('#docToptype').val());
            } 
        }
    })       
}

function fn_selectDocList(docToptype) {
    if(docToptype != 0) {
        var param = {'docToptype': docToptype};
    
        $.ajax({
            url: '/docRegistration/selectDocList',
            type: 'post',
            datatype: "json",        
            contentType: 'application/json; charset=UTF-8',
            data: JSON.stringify(param),
            beforeSend: function () {
                $('#tbody_docList').empty();
            },
            success: function (data) {
                endProgressBar(progressId);
                //console.log(data);
                
                if(data) {
                    var docToptypeList = data.docToptypeList;
                    var docToptypeListLength =  docToptypeList.length;
                    var appendDocListHtml = '';
    
                    if(docToptypeListLength > 0 ) {
    
                        var labeltypeList = ['T', 'P'];
                        var amountList = ['single', 'multi', 'submulti'];
    
                        for(var i = 0; i < docToptypeListLength; i++) {
                            appendDocListHtml += '<tr class="originalTr" data-seq="' + docToptypeList[i].SEQNUM + '">' +
                                                '<td><input type="text" value="' + docToptypeList[i].ENGNM + '" class="inputst_box03" ' +
                                                '       data-originalValue="' + docToptypeList[i].ENGNM + '"></td>' +
                                                '<td><input type="text" value="' + docToptypeList[i].KORNM + '" class="inputst_box03" ' +
                                                '       data-originalValue="' + docToptypeList[i].KORNM + '"></td>' +
                                                '<td><select class="inputst_box03" data-originalValue="' + docToptypeList[i].LABELTYPE + '">' +
                                                        fn_makeOptionHtml(labeltypeList, docToptypeList[i].LABELTYPE) + '</td>' +
                                                '<td><select class="inputst_box03" data-originalValue="' + docToptypeList[i].AMOUNT + '">' +
                                                        fn_makeOptionHtml(amountList, docToptypeList[i].AMOUNT) + '</td>' +
                                                '<td><input type="text" value="' + docToptypeList[i].VALID + '" class="inputst_box03" ' +
                                                '       data-originalValue="' + docToptypeList[i].VALID + '"></td>' +
                                                '<td><button class="btn btn_delete" style="display: inline-block;">Delete</button></td>' +
                                                '</tr>';                                          
                        }
                    } else {
                        appendDocListHtml += '<tr class="newTr">' +
                                            '<td>' +
                                            '<input type="text" class="inputst_box04" placeholder="컬럼명(영문)을 입렵해주세요" >'+
                                            '</td>' +
                                            '<td>' +
                                            '<input type="text" class="inputst_box04" placeholder="컬럼명(한글)을 입렵해주세요" >'+
                                            '</td>' +
                                            '<td>' +
                                            '<select class="inputst_box04">' +
                                            '<option value="T">값 + 위치</option>' +
                                            '<option value="P">위치</option>' +
                                            '</select>' +
                                            '</td>' +
                                            '<td>' +
                                            '<select class="inputst_box04">'+
                                            '<option>single</option>'+
                                            '<option>multi</option>'+
                                            '<option>submulti</option>'+
                                            '</select>'+
                                            '</td>'+
                                            '<td>'+
                                            '<input type="text" class="inputst_box04" placeholder="정규식을 입력해주세요" >'+
                                            '</td>'+
                                            '<td><button class="btn btn_delete" style="display: inline-block;">Delete</button></td>'
                                            '</tr>';
                    }
                }
    
                $('#tbody_docList').append(appendDocListHtml);
            }
        })
    
        function fn_makeOptionHtml(labeltypeList, labeltype) {
            var makeOptionHtml = '';
            var labeltypeListLength = labeltypeList.length;
            for(var i = 0; i < labeltypeListLength; i++) {
                
                if(labeltypeList[i] == labeltype) {
                    makeOptionHtml += '<option value="' + labeltypeList[i] + '" selected>';
                } else {
                    makeOptionHtml += '<option value="' + labeltypeList[i] + '">';
                }
    
                // tbl_icr_label_def 테이블 조회시 LABELTYPE 컬럼 값이 'T' 또는 'P' 일때 값을 치환하고 아닌 경우에는 DB 조회 결과 그대로 출력
                if(labeltypeList[i] == 'T') {
                    makeOptionHtml += '값 + 위치';
                } else if(labeltypeList[i] == 'P') {
                    makeOptionHtml += '위치';
                } else {
                    makeOptionHtml += labeltypeList[i];
                }
    
                makeOptionHtml += '</option>';
            }
    
            return makeOptionHtml;
        }
    } else {
        endProgressBar(progressId);
        var appendDocListHtml = '<tr class="newTr">' +
                            '<td>' +
                            '<input type="text" class="inputst_box04" placeholder="컬럼명(영문)을 입렵해주세요" >'+
                            '</td>' +
                            '<td>' +
                            '<input type="text" class="inputst_box04" placeholder="컬럼명(한글)을 입렵해주세요" >'+
                            '</td>' +
                            '<td>' +
                            '<select class="inputst_box04">' +
                            '<option value="T">값 + 위치</option>' +
                            '<option value="P">위치</option>' +
                            '</select>' +
                            '</td>' +
                            '<td>' +
                            '<select class="inputst_box04">' +
                            '<option>single</option>' +
                            '<option>multi</option>' +
                            '<option>submulti</option>' +
                            '</select>' +
                            '</td>' +
                            '<td>' +
                            '<input type="text" class="inputst_box04" placeholder="정규식을 입력해주세요" >' +
                            '</td>' +
                            '<td><button class="btn btn_delete" style="display: inline-block;">Delete</button></td>' +
                            '</tr>';
        $('#tbody_docList').empty().append(appendDocListHtml);
    }
}


$(document).on('click', '#addTbody', function(){
    var appendDocListHtml = '<tr class="newTr">' +
                        '<td>' +
                        '<input type="text" class="inputst_box04" placeholder="컬럼명(영문)을 입렵해주세요" >'+
                        '</td>' +
                        '<td>' +
                        '<input type="text" class="inputst_box04" placeholder="컬럼명(한글)을 입렵해주세요" >'+
                        '</td>' +
                        '<td>' +
                        '<select class="inputst_box04">' +
                        '<option value="T">값 + 위치</option>' +
                        '<option value="P">위치</option>' +
                        '</select>' +
                        '</td>' +
                        '<td>' +
                        '<select class="inputst_box04">'+
                        '<option>single</option>'+
                        '<option>multi</option>'+
                        '<option>submulti</option>'+
                        '</select>'+
                        '</td>'+
                        '<td>'+
                        '<input type="text" class="inputst_box04" placeholder="정규식을 입력해주세요" >'+
                        '</td>'+
                        '<td><button class="btn btn_delete" style="display: inline-block;">Delete</button></td>'
                        '</tr>';
    $('#tbody_docList').append(appendDocListHtml);
    $('#tbody_div').scrollTop($("#tbody_div")[0].scrollHeight);

})

$(document).on('click', '.btn_delete', function(){
    var seq = $(this).closest('tr').attr('data-seq');
    //console.log(seq);
    if(seq) {
        deleteList.push(seq);
    }
    $(this).closest('tr').remove();
})

// 문서등록 테이블 selectbox 수정시 tr 색깔 변경
$(document).on('change', '#tbody_docList .originalTr select', function() {
    var originalValue = $(this).attr('data-originalValue');
    var changeValue = $(this).val();
    //console.log(originalValue);
    //console.log(changeValue);

    if(originalValue == changeValue) {
        $(this).closest('td').removeClass('on');
        if($(this).closest('tr').find('td.on').length == 0) {
            $(this).closest('tr').removeClass('on');
        } 
    } else {
        $(this).closest('td').addClass('on');
        $(this).closest('tr').addClass('on');
    }
    
})

// 문서등록 테이블 input[text] 수정시 tr 색깔 변경
$(document).on('focusout', '#tbody_docList .originalTr input[type=text]', function() {
    var originalValue = $(this).attr('data-originalValue');
    var changeValue = $(this).val();
    //console.log(originalValue);
    //console.log(changeValue);

    if(originalValue == changeValue) {
        $(this).closest('td').removeClass('on');
        if($(this).closest('tr').find('td.on').length == 0) {
            $(this).closest('tr').removeClass('on');
        }
    } else {
        $(this).closest('td').addClass('on');
        $(this).closest('tr').addClass('on');
    }
    
})

/**
 * 문서등록 저장
 * 추가, 수정, 삭제 행위에 따른 tbl_icr_label_def 테이블 동기화
 */
$(document).on('click', '#btn_save', function() {
    
    var changeList = [];
    var insertList = [];
    var docToptype = $('#docToptype').val();
    var docNameEng = $('#docNameEng').val().trim();
    var docNameKor = $('#docNameKor').val().trim();

    if(docToptype == 0 && docNameEng == "") {
        fn_alert('alert', '신규문서명을 입력해주세요.');
        $('#docNameEng').focus();
        return;
    }

    // 추가
    var $newTr = $('#tbody_docList .newTr');
    var newTrLength = $newTr.length;
    for(var i = 0; i< newTrLength; i++) {
        var engNm = $newTr[i].children[0].getElementsByTagName('input')[0].value.trim();
        var korNm = $newTr[i].children[1].getElementsByTagName('input')[0].value.trim();
        var labelType = $newTr[i].children[2].getElementsByTagName('select')[0].value;
        var amount = $newTr[i].children[3].getElementsByTagName('select')[0].value;
        var valid = $newTr[i].children[4].getElementsByTagName('input')[0].value.trim();

        if(engNm == "" || valid == "") {
            fn_alert('alert', '값을 입력해주시거나 행을 삭제해주세요');
            $newTr[i].children[0].getElementsByTagName('input')[0].focus();
            return;
        }

        var trValue = {
            'engNm' : engNm,
            'korNm' : korNm,
            'labelType' : labelType,
            'amount' : amount,
            'valid' : valid,
        }
        insertList.push(trValue);
    }

    // 수정
    var $changeTr = $('#tbody_docList .originalTr.on');
    var changeTrLength = $changeTr.length;
    for(var i = 0; i < changeTrLength; i++) {
        var engNm = $changeTr[i].children[0].getElementsByTagName('input')[0].value.trim();
        var korNm = $changeTr[i].children[1].getElementsByTagName('input')[0].value.trim();
        var labelType = $changeTr[i].children[2].getElementsByTagName('select')[0].value;
        var amount = $changeTr[i].children[3].getElementsByTagName('select')[0].value;
        var valid = $changeTr[i].children[4].getElementsByTagName('input')[0].value.trim();
        if(engNm == "" || valid == "") {
            fn_alert('alert', '값을 입력해주시거나 행을 삭제해주세요');
            $changeTr[i].children[0].getElementsByTagName('input')[0].focus();
            return;
        }

        var trValue = {
            'seqNum' : $changeTr[i].getAttribute('data-seq'),
            'engNm' : $changeTr[i].children[0].getElementsByTagName('input')[0].value,
            'korNm' : $changeTr[i].children[1].getElementsByTagName('input')[0].value,
            'labelType' : $changeTr[i].children[2].getElementsByTagName('select')[0].value,
            'amount' : $changeTr[i].children[3].getElementsByTagName('select')[0].value,
            'valid' : $changeTr[i].children[4].getElementsByTagName('input')[0].value,
        }
        changeList.push(trValue);
    }

    // 삭제는 상단 전역변수로 저장돼있음

    if(docToptype != 0 && insertList.length == 0 && changeList.length == 0 && deleteList.length == 0) {
        fn_alert('alert', '변경사항이 없습니다');
        return;
    }
    
    var param = {
        'docToptype' : docToptype,
        'insertList' : insertList,
        'changeList' : changeList,
        'deleteList' : deleteList,
        'docNameEng' : docNameEng,
        'docNameKor' : docNameKor
    };
    
    $.ajax({
        url: '/docRegistration/updateDocList',
        type: 'post',
        datatype: "json",        
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(param),
        beforeSend: function () {
            $('#tbody_docList').empty();
            $("#progressMsgTitle").html("Update DocList...");
            progressId = showProgressBar();
        },
        success: function (data) {
            endProgressBar(progressId);
            if(data.docToptype) {
                docToptype = data.docToptype;
            }
            fn_selectDocTopType(docToptype);
        }
    })

})


// 초기화
function _init() {
    fn_selectDocTopType(); //doctoptype 검색
}