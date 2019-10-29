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
      let key = Object.keys(jj).sort((a,b) => {
        return a-b; 
      });
      // console.log(jj[7463])
      for(let i=7463; i<=7613; i++) {
        if(jj[i].transactionIds.length != jj[i].expectedTotal) {
          console.log('잘모소딘게 있따.')
          process.exit(1);
        } else {
          console.log(i+'번째까지 잘못된게 없음. ')
        }
      }

      // for(const obj of jj) {
      //   if(obj.transactionIds.length !== obj.expectedTotal) {
      //     console.log('잘모소딘게 있따.')
      //   }
       
      // }
      // console.log('obj.blockNumber:잘못업)
    //  }
}
