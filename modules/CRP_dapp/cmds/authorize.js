const fs = require('fs'); // file-system
const path = require('path'); // path-package
let args_dir = path.resolve(__dirname, 'args'); // argument file이 위치한 directory path
let params = fs.readFileSync(args_dir + '/authorize.json');
let args = JSON.parse(params);
const provider = args.provider; // http-based web3 provider
let web3_path = (args.web3 == 'null')? ('web3') :(args.web3); // crp-web3 path
const passwd = args.adminpass; // admin's password
let authorized = args.account; // the account to be authorized
/* web3 provider 설정 */
const Web3 = require(web3_path); // web3 api
let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(provider)); // set provider

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
 * 권한할당 tx를 생성하는 함수이다. 아래의 절차에 따라 진행된다.
 * 1. admin 주소가 local wallet에 존재하는지 확인
 * 2. unlock Account 수행
 * 3. sendPer인missionTx 발행
 * 4. getTransactionReceipt를 통해, 발행된 tx가 블록에 실렸는지 확인
 * 5. lock Account 수행
 * 
 * @author jhhong
 */
let Authorize = async () => {
    try {
        if(!web3.eth.isAccount(web3.eth.getAdminAddress())) { // local wallet에 admin 존재 여부 체크
            throw new Error('[' + web3.eth.getAdminAddress() + '] is not exist in the local wallet!');
        }
        let owner = web3.eth.getAdminAddress(); // CRP admin 계정 추출
        let gas = web3.eth.estimateGas({from: owner}); // authorize tx gas estimation
        await web3.personal.unlockAccount(owner, passwd, gas); // Unlock Account (to prevent "intrinsic gas too low")
        let tx = web3.eth.sendPermissionTx(owner, authorized, gas); // 권한 획득 tx 생성
        console.log('TX (authorize) Hash=[' + tx + ']');
        let receipt; // receipt object를 받을 변수
        do {
            receipt = await web3.eth.getTransactionReceipt(tx); // receipt 확인
            if(receipt) {
                console.log('Tx included! Status=[' + receipt.status + ']');
                break;
            }
            console.log("Wait for including Tx... Block=[" + web3.eth.blockNumber + "]");
            await milisleep(4000); // 4초 대기
        } while(!receipt);
        await web3.personal.lockAccount(owner); // Lock Account
    } catch(err) {
        console.log(err);
    }
}
/**
 * 프로시져 수행 메인 함수이다. 
 * 
 * 1. clear screen
 * 2. Authorize
 * 
 * @author jhhong
 */
let RunProc = async () => {
    try {
        console.clear();
        /* 파라메터 체크 */
        console.log('* param1 (provider):...........' + args.provider);
        console.log('* param2 (web3 path):..........' + args.web3);
        console.log('* param3 (admin password):.....' + args.adminpass);
        console.log('* param4 (authorized account):.' + args.account);
        await Authorize();
    } catch(err) {}
}
RunProc();
