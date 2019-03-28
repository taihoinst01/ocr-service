"use strict";

var progressId; // progress Id
var deleteList = []; // 문서등록 테이블 행 삭제시 seq번호 저장

$(function () {
	_init();
	setting();
});


function setting() {
	$.ajax({
		url: '/setting/selectTxtList',
		type: 'post',
		datatype: "json",
		contentType: 'application/json; charset=UTF-8',
		beforeSend: function () {
		},
		success: function (data) {
			console.log(data);
			
		}
	});
}

function fn_selectDocTopType(docToptype) {
	$.ajax({
		url: '/setting/selectDocTopType',
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
			if (data) {
				var docToptypeList = data.docToptypeList;
				var docToptypeListLength = docToptypeList.length;

				appendOptionHtml += '<option value="0">신규</option>';

				if (docToptypeListLength > 0) {

					for (var i = 0; i < docToptypeListLength; i++) {
						if (docToptype) {
							appendOptionHtml += '<option value="' + docToptypeList[i].SEQNUM + '"' + (docToptype == docToptypeList[i].SEQNUM ? 'selected' : '') + '>' + docToptypeList[i].ENGNM + '</option>';
						} else {
							appendOptionHtml += '<option value="' + docToptypeList[i].SEQNUM + '"' + (i == 0 ? 'selected' : '') + '>' + docToptypeList[i].ENGNM + '</option>';
						}
					}
				}

				$('#docToptype').append(appendOptionHtml);
				fn_selectDocLabelDefList($('#docToptype').val());
			}
		}
	})
}

function fn_selectDocLabelDefList(docToptype) {
	if (docToptype != 0) {
		var param = { 'docToptype': docToptype };

		$.ajax({
			url: '/setting/selectDocLabelDefList',
			type: 'post',
			datatype: "json",
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify(param),
			beforeSend: function () {
				$('#tbody_docList').empty();
			},
			success: function (data) {
				endProgressBar(progressId);

				if (data) {
					var docToptypeList = data.docToptypeList;
					var docToptypeListLength = docToptypeList.length;
					var appendDocListHtml = '';

					if (docToptypeListLength > 0) {

						var labeltypeList = ['T', 'P'];
						var amountList = ['single', 'multi', 'submulti'];

						for (var i = 0; i < docToptypeListLength; i++) {
							if (docToptypeList[i].ESSENTIALVAL == "1") {
								appendDocListHtml += '';
							}
							else {
								appendDocListHtml += '';
							}
						}
					} else {
						appendDocListHtml += '';
					}
				}
				$('#tbody_docList2').html(appendDocListHtml);
				$(".docTable2").mCustomScrollbar("destroy");
			}
		})
	} else {
		endProgressBar(progressId);
		var appendDocListHtml = '';
		$('#tbody_docList').empty().append(appendDocListHtml);
	}
}


$(document).on('click', '#addTbody', function () {
	var appendDocListHtml = '<tr class="newTr">' +
		'<td>' +
		'<input type="text" class="inputst_box04" placeholder="ICR 인식 결과 분리하고 싶은 키워드를 입력해주세요." >' +
		'</td>' +
		'<td><button class="btn btn_delete" style="display: inline-block;">Delete</button></td>'
	'</tr>';
	$('#tbody_docList').append(appendDocListHtml);

	$(".docTable2").mCustomScrollbar("destroy");
	$('#tbody_div').animate({scrollTop:$("#tbody_div")[0].scrollHeight}, 'slow');
})

$(document).on('click', '.btn_delete', function () {
	var seq = $(this).closest('tr').attr('data-seq');
	if (seq) {
		deleteList.push(seq);
	}
	$(this).closest('tr').remove();
})

// 문서등록 테이블 selectbox 수정시 tr 색깔 변경
$(document).on('change', '#tbody_docList .originalTr select', function () {
	var originalValue = $(this).attr('data-originalValue');
	var changeValue = $(this).val();

	if (originalValue == changeValue) {
		$(this).closest('td').removeClass('on');
		if ($(this).closest('tr').find('td.on').length == 0) {
			$(this).closest('tr').removeClass('on');
		}
	} else {
		$(this).closest('td').addClass('on');
		$(this).closest('tr').addClass('on');
	}

})

// 문서등록 테이블 input[text] 수정시 tr 색깔 변경
$(document).on('focusout', '#tbody_docList .originalTr input[type=text]', function () {
	var originalValue = $(this).attr('data-originalValue');
	var changeValue = $(this).val();

	if (originalValue == changeValue) {
		$(this).closest('td').removeClass('on');
		if ($(this).closest('tr').find('td.on').length == 0) {
			$(this).closest('tr').removeClass('on');
		}
	} else {
		$(this).closest('td').addClass('on');
		$(this).closest('tr').addClass('on');
	}

})

// 문서등록 테이블 checkbox 수정시 tr 색깔 변경
$(document).on('change', '#tbody_docList .originalTr input[type=checkbox]', function () {
	var originalValue = $(this).attr('data-originalValue');
	//console.log("originalValue : " + originalValue + "current value : " + $(this).is(":checked"));

	var changeValue = "";
	if ($(this).is(":checked")) { changeValue = "1"; }
	else { changeValue = "0"; }

	if (originalValue == changeValue) {
		$(this).closest('td').removeClass('on');
		if ($(this).closest('tr').find('td.on').length == 0) {
			$(this).closest('tr').removeClass('on');
		}
	} else {
		$(this).closest('td').addClass('on');
		$(this).closest('tr').addClass('on');
	}

})

/* OCR인식결과 분리하고 싶은 키워드 저장 */
$(document).on('click', '#btn_save', function () {
	var addList = [];


	// 추가
	var $newTr = $('#tbody_docList .newTr');
	var newTrLength = $newTr.length;

	if(newTrLength < 1) {
		fn_alert('alert', '변동사항이 없습니다');
		return;
	} else {
		for(var i = 0; i < newTrLength; i++) {
			var text = $newTr[i].children[0].getElementsByTagName('input')[0].value.trim();
	
			if (text == "") {
				fn_alert('alert', '키워드를 입력해주시거나 행을 삭제해주세요');
				$newTr[i].children[0].getElementsByTagName('input')[0].focus();
				return;
			}
			addList.push(text);
		}
	}

	var param = {
		'addList': addList
	};

	$.ajax({
		url: '/setting/updateTxt',
		type: 'post',
		datatype: "json",
		contentType: 'application/json; charset=UTF-8',
		data: JSON.stringify(param),
		beforeSend: function () {
			$('#tbody_docList').empty();
			$("#progressMsgTitle").html("Update...");
			progressId = showProgressBar();
		},
		success: function (data) {
			endProgressBar(progressId);
		}
	});

});

// 초기화
function _init() {
	fn_selectDocTopType(); //doctoptype 검색
}

function checkboxChecked(essentialval) {

	if (essentialval == "1") {
	}
	else {
		document.getElementById(i).checked = true;
	}

}