const fs = require('fs')

aa();

function aa () {
    const result = fs.readFileSync('/home/fabric/fabric-samples/checkpoint/hcc-channel/hccListener');  
    // console.log(result)
    const jj = JSON.parse(result); ////checkpoint.load();  
    console.log(jj)
    console.log(typeof(jj))
    // console.log(jj."7011".transactionIds.length)
    // console.log(jj.'7011'.expectedTotal)
    // console.log(result."7011")
    //  for(let i=7011; i<=7080; i++) { 
      let test = jj.hasOwnProperty('blockNumber')
      console.log(test);
      let key = Object.keys(jj).sort();
      console.log(key)
      // for(const obj of jj) {
      //   console.log('obj.blockNumber:'+obj.blockNumber)
      // }
    //  }
}
