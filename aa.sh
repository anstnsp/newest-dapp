curl -H "Content-type: application/json" -d '{ 
	"pub":[ 
				{"refundNumber" : "2019-08-05-00001_302",
					"refundData": { 
						"orderSequence": 1,
						"productCode": "B000001",
						"refundStatusCode":"F2",
						"refundStatusMemo": "",
						"deliverCode":"",
						"refundDate" : "20190812150223",
						"retryYn" : false,
						"fastRefundYn" : false,
						"refundReason": "01",
						"refundFee": 100,
						"invoiceNumber": "",
						"returnCompletedDate": ""
					
					}
				},
				{"refundNumber" : "2019-08-05-00001_303",
					"refundData": { 
						"orderSequence": 2,
						"productCode": "B000001",
						"refundStatusCode":"F2",
						"refundStatusMemo": "",
						"deliverCode":"",
						"refundDate" : "20190812150223",
						"retryYn" : false,
						"fastRefundYn" : false,
						"refundReason": "01",
						"refundFee": 100,
						"invoiceNumber": ""
					
					}
				}
			],
	"priv":[
				{"refundNumber" : "2019-08-05-00001_302",
					"userData": { 
						"orderCode": "2019-08-05-00001",
						"customerName": "홍길동",
						"zipCode": "1231",
						"baseAddress":"서울",
						"detailAddress":"아파트 110호",
						"telNumber":"02-123-1111",
						"cellNumber":"010-3323-9292",
						"extraMemo":"관리실에 줘"
					}
				},
				{"refundNumber" : "2019-08-05-00001_303",
					"userData": { 
						"orderCode": "2019-08-05-00001",
						"customerName":"홍길동",
						"zipCode": "1231",
						"baseAddress":"서울",
						"detailAddress":"아파트 110호",
						"telNumber":"02-123-1111",
						"cellNumber":"010-3323-9292",
						"extraMemo":"관리실에 줘"
					}
				}
			]
}' 'http://192.168.56.1:1111/refund'
