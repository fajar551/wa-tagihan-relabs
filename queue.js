var queue = require('queue');

var q = queue({
    concurrency:1,
    results: [],
    autostart:true
});

const arrComannds = [];

function generateSumFunction(cb, delay, command) {
    setTimeout(function () {
        console.log('slow job finished ' + delay);
        command();
        cb()
      }, delay);
}


q.on('start', function (next, job) {
    console.log("Pending proses "+  q.length);
})


q.on('end', function (next, job) {
    console.log("Pending proses "+  0);
})


function bulkCommand(datas = [
    function(){
        console.log("809899", "juara")
    }
]) {

    datas.forEach(cmd =>{
        const randomNum = Math.floor(Math.random() * 4) + 3 * 1000;
        arrComannds.push({num:randomNum,cmd});
    })


    arrComannds.forEach(element => {
        q.push(function (cb) {
            generateSumFunction(cb, element.num, element.cmd)
          })
    });

    // console.log("Pending proses "+  arrComannds.length);
}

function appendCommand(cmd){
    const randomNum = (Math.floor(Math.random() * 3) + 1) * 1000;
    q.push(function (cb) {
        generateSumFunction(cb, randomNum, cmd)
    })
}

function getPending(){
    return q.length;
}


// appendCommand(()=>console.log('aa'));
// appendCommand(()=>console.log('bb'));
// appendCommand(()=>console.log('cc'));
// bulkCommand([()=>console.log('a'), ()=>console.log('b'),()=>console.log('c'), ()=>console.log('d')])

module.exports = {
    bulkCommand,
    appendCommand,
    getPending
};