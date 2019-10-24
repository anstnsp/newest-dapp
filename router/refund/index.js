const express = require('express');
const router = express.Router(); 
const controller = require('../../controller/refund/controller.js');

//환불상품 조회 (PUBLIC) /refund/ordCd/1/ordGdCd/32 , /refund/private/rfdmSq/33  /refund?컬럼명=밸류
router.get('/', controller.query_item, controller.common_query);
//환불상품 조회 (PRIVATE)//req.param('id') => ?id='anstnsp'&pwd='ff' , req.params.ordCd => :ordCd
router.get('/private', controller.query_item_with_private, controller.common_query);
//리치쿼리 
// router.get('/', controller.query_item_by_columnname_value, controller.common_query);
// //환불상품 저장([PUBLIC+PRIVATE])
router.post('/', controller.insert_item_with_private, controller.common_insert_update);
//환불상품상태 수정(PUBLIC/PRIVATE)
router.put('/private', controller.update_item_with_private, controller.common_insert_update);
//환불상품상태 수정(PUBLIC)
router.put('/', controller.update_item, controller.common_insert_update);




module.exports = router; 