let provider = require("../api/provider.js"); // eth.accounts 얻어오기 위함
let utils = require("../api/utils.js"); // utils 함수를 사용하기 위함
let act = require("../api/api_action.js");
let api_token = require("../api/api_token.js");

/**
 * Usage 출력 함수이다.
 * 
 * @author jhhong
 */
function Usage() {
    console.log("Usage --> ");
    console.log("    node TestTokenBurn.js [argv1] [argv2] [argv3] [argv4]");
    console.log("....argv1: Owner 계정 (Index)");
    console.log("....argv2: 계정의 암호");
    console.log("....argv3: 토큰 컨트랙트 주소");
    console.log("....argv4: 소각할 금액");
}

/**
 * 진행상황 출력 함수이다.
 * 
 * @param _result 성공 / 실패
 * @param _count 시도 횟수
 * @author jhhong
 */
function showProgress(_result, _count) {
    if(_result == true) {
        console.log("[" + _count + "]th trying...Success!");
    } else {
        console.log("[" + _count + "]th trying...Failed!");
    }
}

/**
 * 화면을 클리어한다.
 * 
 * @author jhhong
 */
function ClearScreen() {
    console.clear();
    console.log(".");
    console.log(".");
    console.log(".");
} 

/**
 * 프로시져 수행 메인 함수이다. 
 * 
 * @author jhhong
 */
let RunProc = async () => {
    try {
        ClearScreen();
        if(process.argv.length != 6) {
            Usage();
            throw new Error("Invalid Argument!");
        }
        /* 파라메터 체크 */
        console.log('* Param01 (Owner Account Index):.......' + process.argv[2]);
        console.log('* Param02 (Owner Password):............' + process.argv[3]);
        console.log('* Param03 (CrpToken Address):..........' + process.argv[4]);
        console.log('* Param04 (Burn Amount):...............' + process.argv[5]);
        const owner = provider.web3.eth.accounts[process.argv[2]]; // owner account 주소
        const passwd = process.argv[3]; // owner 비번
        const tokenaddr = process.argv[4]; // 토큰 컨트랙트 주소
        const amount = process.argv[5]; // 소각 금액
        console.log('Owner Account: [' + owner + ']');
        let tokenobj = await api_token.getObject(tokenaddr);
        console.log("### Owner [" + owner + "]의 엑티브 발란스: --> ", utils.getEther(tokenobj.activeOf(owner).toString(10)));
        console.log("    총 통화량: --> ", utils.getEther(tokenobj.totalSupply().toString(10)));
        if(await act.tryActions(api_token.burn, showProgress, false, 5, true, owner, passwd, tokenaddr, utils.getWei(amount)) == false) {
            throw new Error("Failed! (burn)");
        }
        console.log("### Owner [" + owner + "]의 엑티브 발란스: --> ", utils.getEther(tokenobj.activeOf(owner).toString(10), "done!"));
        console.log("    총 통화량: --> ", utils.getEther(tokenobj.totalSupply().toString(10), "done!"));
    } catch(err) {
        console.log(err);
    }
}
RunProc();