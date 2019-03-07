const fs = require('fs');
const path = require('path');

console.log('* param1 (provider):.......' + process.argv[2]);
console.log('* param2 (web3 path):......' + process.argv[3]);
console.log('* param3 (sender account):..' + process.argv[4]);
console.log('* param4 (sender password):.' + process.argv[5]);
console.log('* param5 (receiver account):' + process.argv[6]);
console.log('* param5 (amount):..........' + process.argv[7]);

const provider = process.argv[2];
const sender = process.argv[4];
const passwd = process.argv[5];
const receiver = process.argv[6];
let web3_path = (process.argv[3] == 'null') ? ('web3') : (process.argv[3]);

/* web3 provider 설정 */
const Web3 = require(web3_path); // web3 api
let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(provider)); // set provider

const amount = web3.toWei(process.argv[7], 'ether');


/**
 * 지정된 시간(ms)만큼 대기한다.  
 *
 * @param _ms 지정한 시간 (ms)
 * @return promise object
 * @author jhhong
 */
function milisleep(_ms) {
    return new Promise(resolve => setTimeout(resolve, _ms));
}
/** 
 * @author sykang
 */

let sendCrp = async () => {
    try {
        await milisleep(1000);
        await web3.personal.unlockAccount(sender, passwd); // Unlock Account

        let receipt;
        let tx_hash = await web3.eth.sendTransaction({
            from: sender,
            to: receiver,
            value: amount,
        });
        console.log('TX Hash=[' + tx_hash + ']');
        do {
            receipt = await web3.eth.getTransactionReceipt(tx_hash); // receipt 확인
            if (receipt) {
                console.log("Tx included! BlockHash=[" + receipt.blockHash + "]");
                console.log("Tx included! BlockNumber=[" + receipt.blockNumber + "]");
                break;
            }
            console.log("Wait for including Tx... Block=[" + web3.eth.blockNumber + "]");
            await milisleep(4000); // 4초 대기
        } while (!receipt);

        await web3.personal.lockAccount(sender); // Lock Account
    } catch (err) {
        console.log(err);
    }
}
sendCrp();
