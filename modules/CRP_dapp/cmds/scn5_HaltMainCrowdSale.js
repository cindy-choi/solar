const fs = require('fs'); // file-system
const path = require('path'); // path-package
let args_dir = path.resolve(__dirname, 'args');
let init_params = fs.readFileSync(args_dir + '/init.json', 'utf8');
let init = JSON.parse(init_params);
const provider = init.provider;
const owner = process.argv[2];
const passwd = process.argv[3];
let web3_path = (init.web3 == 'null') ? ('web3') : (init.web3);
/* web3 provider 설정 */
const Web3 = require(web3_path); // web3 api
let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(provider)); // set provider
/* deploy에 필요한 요소들 추출 (abi, data, gas) */

let abi_path = path.resolve(__dirname, 'abi', 'CrpMain.abi'); // abi가 저장된 file path
let data_path = path.resolve(__dirname, 'data', 'CrpMain.data'); // data를 저장할 file path
let abi = fs.readFileSync(abi_path, 'utf-8'); // abi 추출
let Main = web3.eth.contract(JSON.parse(abi)); // get contract
let contract;
let sale_contract;
let token_contract;
let result_sale;
let data = fs.readFileSync(data_path, 'utf-8'); // bytecode 추출
let count;
let head;
let now_posit;

let sale_address;

const tx_list = [];

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
let HaltCrwodSale = async () => {
    try {
        console.log("halt crowd sale .....");
        await milisleep(1000);
        await web3.personal.unlockAccount(owner, passwd); // Unlock Account
        main_address = await web3.eth.getMainContractAddress(owner);
        if (main_address == '0x0000000000000000000000000000000000000000') {
            throw new Error('The main contact created by [' + owner + '] does not exist.!');
        }
        
        contract = Main.at(main_address);
        let receipt; // receipt object를 받을 변수
        let tx;
        let gas = web3.eth.estimateGas({
            data: data
        }); // gas값 계산
        abi_path = path.resolve(__dirname, 'abi', 'CrpSaleMain.abi'); // abi가 저장된 file path
        data_path = path.resolve(__dirname, 'data', 'CrpSaleMain.data'); // data를 저장할 file path
        abi = fs.readFileSync(abi_path, 'utf-8'); // abi 추출
        let sale = web3.eth.contract(JSON.parse(abi)); // get contract

        sale_address = await contract.getCrowdSaleAddress(0
            , {
            from: owner
        });
        sale_contract = sale.at(sale_address);
        // gas = await sale_contract.saleHalt.estimateGas({
        //     from: owner
        // });
        let block = await web3.eth.getBlock("latest");
        gas = block.gasLimit;
        tx = await sale_contract.saleHalt({
            from: owner,
            gas: gas
        });
        console.log('TX Hash=[' + tx + ']');
        do {
            receipt = await web3.eth.getTransactionReceipt(tx); // receipt 확인
            if (receipt) {
                console.log("Included in the Block = [" +  receipt.blockNumber + "] HASH = [" +receipt.blockHash + "]!");
                break;
            }
            console.log("Wait for including Tx... Block=[" + web3.eth.blockNumber + "]");
            await milisleep(4000); // 4초 대기
        } while (!receipt);

        count = await sale_contract.chain_count({
            from: owner
        });

        head = await sale_contract.chain_head({
            from: owner
        }).toString();
        now_posit = head;

        result_sale = await sale_contract.total_staff_CRP({
            from: owner
        }).toNumber();
    } catch (err) {
        console.log(err);
    }
}

let createToken = async () => {
    try {
        console.log('chage main contract stage to PROCEEDING .....');
        gas = await contract.changeStage.estimateGas(3, {
            from: owner
        });
        let stage_tx = await contract.changeStage(3, {
            from: owner,
            gas: gas
        });
        do {
            receipt = await web3.eth.getTransactionReceipt(stage_tx); // receipt 확인
            if (receipt) {
                console.log("Included in the Block = [" +  receipt.blockNumber + "] HASH = [" +receipt.blockHash + "]!");                break;
            }
            console.log("Wait for including Tx... Block=[" + web3.eth.blockNumber + "]");
            await milisleep(4000); // 4초 대기
        } while (!receipt);

        abi_path = path.resolve(__dirname, 'abi', 'CrpToken.abi'); // abi가 저장된 file path
        data_path = path.resolve(__dirname, 'data', 'CrpToken.data'); // data를 저장할 file path
        abi = fs.readFileSync(abi_path, 'utf-8'); // abi 추출
        let token = web3.eth.contract(JSON.parse(abi));

        let token_address = await contract.getTokenAddress({
            from: owner
        });
        token_contract = token.at(token_address);
        data = fs.readFileSync(data_path, 'utf-8'); // bytecode 추출

        let tmp_tx;

        //issue
        console.log('create Token .....');
        var i;
        for (i = 0; i < count; ++i) {
            var balance = await sale_contract.balanceOf(now_posit);
            gas = await token_contract.issue.estimateGas(now_posit, balance, {
                from: owner
            });
            tmp_tx = await token_contract.issue(now_posit, balance, {
                from: owner,
                gas: gas
            });
            tx_list.push(tmp_tx);
            console.log('issue[' + i + '] : [' + tmp_tx + ']');

            now_posit = await sale_contract.getNextAddr(now_posit, {
                from: owner
            });
        }
        //settle
        var i;
        var tmp = await contract.staff_list({
            from: owner
        });
        count = tmp[2];
        now_posit = tmp[0];
        for (i = 0; i < count; ++i) {
            var tmp_info = await contract.getStaffInfo(now_posit, {
                from: owner
            });
            var amount = tmp_info[1];
            var total_amount = result_sale * amount / 100;
            gas = await token_contract.settle.estimateGas(now_posit, total_amount, {
                from: owner
            });
            tmp_tx = await token_contract.settle(now_posit, total_amount, {
                from: owner,
                gas: gas
            });
            tx_list.push(tmp_tx);
            console.log('settle=[' + i + "] : [" + tx_list[i] + ']');
            now_posit = await sale_contract.getNextAddr(now_posit, {
                from: owner
            });
        }

        //fund contract
        abi_path = path.resolve(__dirname, 'abi', 'CrpFund.abi'); // abi가 저장된 file path
        data_path = path.resolve(__dirname, 'data', 'CrpFund.data'); // data를 저장할 file path
        abi = fs.readFileSync(abi_path, 'utf-8'); // abi 추출
        let fund = web3.eth.contract(JSON.parse(abi));

        let fund_address = await contract.getFundAddress({
            from: owner
        });
        fund_contract = fund.at(fund_address);

        //fund contract deposit
        let block = await web3.eth.getBlock("latest");
        gas = block.gasLimit;

        tmp_tx = await sale_contract.TransferFund({
            from: owner,
            gas: gas
        });
        tx_list.push(tmp_tx);
        console.log('transfer to fund, tx = [' + tmp_tx + ']');

        //fund contract withdraw 
        let init = await sale_contract.init_amount({
            from: owner
        });
        block = await web3.eth.getBlock("latest");
        gas = block.gasLimit;
        tmp_tx = await fund_contract.withdraw(owner, init, {
            from: owner,
            gas: gas
        });
        tx_list.push(tmp_tx);
        console.log('withdraw init_amount to owner, tx = [' + tmp_tx + ']');

       
        for (i = 0; i < tx_list.length; ++i) {
            do {
                receipt = await web3.eth.getTransactionReceipt(tx_list[i]);
                if (receipt) {
                    console.log("Included in the Block = [" +  receipt.blockNumber + "] HASH = [" +receipt.blockHash + "]!");
                    break;
                }
                console.log("Wait for including Tx... Block=[" + web3.eth.blockNumber + "]");
                await milisleep(4000); // 4초 대기
            } while (!receipt)
        }
    } catch (err) {
        console.log(err);
    }
}

let refundCRP = async () => {
    try {
        console.log('chage main contract stage to FAILED.....');
        gas = await contract.changeStage.estimateGas(4, {
            from: owner
        });
        let stage_tx = await contract.changeStage(4, {
            from: owner,
            gas: gas
        });
        do {
            receipt = await web3.eth.getTransactionReceipt(stage_tx); // receipt 확인
            if (receipt) {
                console.log("Included in the Block = [" +  receipt.blockNumber + "] HASH = [" +receipt.blockHash + "]!");                break;
            }
            console.log("Wait for including Tx... Block=[" + web3.eth.blockNumber + "]");
            await milisleep(4000); // 4초 대기
        } while (!receipt);
        
        console.log('refund to holder .....');
        var i;
        console.log("test : " + now_posit);
        for (i = 0; i < count; ++i) {
            // gas = await sale_contract.refund.estimateGas(now_posit, {
            //     from: owner
            // })
            let block = await web3.eth.getBlock("latest");
            gas = block.gasLimit;
            tx_list[i] = await sale_contract.refund(now_posit, {
                from: owner,
                gas: gas
            });
            console.log('TX Hash=[' + i + "] : [" + tx_list[i] + ']');

            now_posit = await sale_contract.getNextAddr(now_posit, {
                from: owner
            });
        }

        const refund_receipt = [];
        for (i = 0; i < count; ++i) {
            do {
                refund_receipt[i] = await web3.eth.getTransactionReceipt(tx_list[i]);
                if (refund_receipt[i]) {
                    console.log("Included in the Block = [" +  receipt.blockNumber + "] HASH = [" +receipt.blockHash + "]!");
                    break;
                }
                console.log("Wait for including Tx... Block=[" + web3.eth.blockNumber + "]");
                await milisleep(4000); // 4초 대기
            } while (!refund_receipt[i])
        }

    } catch (err) {
        console.log(err);
    }
}

let deployRoadmap = async () => {
    try {

        let road_data;
        road_data = await contract.getRoadmapPollParams(0, {
            from: owner
        });

        abi_path = path.resolve(__dirname, 'abi', 'CrpPollRoadmap.abi'); // abi가 저장된 file path
        data_path = path.resolve(__dirname, 'data', 'CrpPollRoadmap.data'); // data를 저장할 file path
        abi = fs.readFileSync(abi_path, 'utf-8'); // abi 추출
        let road = web3.eth.contract(JSON.parse(abi));
        data = fs.readFileSync(data_path, 'utf-8'); // bytecode 추출
        let data_with_params = road.new.getData(road_data[0], road_data[1], main_address, {
            data: data
        })
        gas = web3.eth.estimateGas({
            data: data_with_params
        });
        let road_contract = await road.new(road_data[0], road_data[1], main_address, {
            from: owner,
            data: data,
            gas: gas,
            mca: main_address
        })
        console.log('TX Hash=[' + road_contract.transactionHash + ']');
        do {
            receipt = await web3.eth.getTransactionReceipt(road_contract.transactionHash); // receipt 확인
            if (receipt) {
                console.log("Tx included! CA=[" + receipt.contractAddress + "]");
                break;
            }
            console.log("Wait for including Tx... Block=[" + web3.eth.blockNumber + "]");
            await milisleep(4000); // 4초 대기
        } while (!receipt);

        console.log('regist roadmap contract .....');
        let regist_road = await contract.addRoadMapPollAddress(receipt.contractAddress, {
            from: owner,
        });
        console.log('TX Hash=[' + regist_road + ']');
        do {
            receipt = await web3.eth.getTransactionReceipt(regist_road); // receipt 확인
            if (receipt) {
                console.log("Included in the Block = [" +  receipt.blockNumber + "] HASH = [" +receipt.blockHash + "]!");
                break;
            }
            console.log("Wait for including Tx... Block=[" + web3.eth.blockNumber + "]");
            await milisleep(4000); // 4초 대기
        } while (!receipt);

        await web3.personal.lockAccount(owner); // Lock Account

    } catch (err) {
        console.log(err);
    }
}

/**
 * 크라우드세일 마감 이후 수행 시나리오에 맞게 각 과정을 수행하는 함수이다. 
 * 
 * 1. HaltStaffPoll 수행
 * 2. SetParams 수행
 * 
 * @author sykang
 */
let RunProc = async () => {
    try {
        console.clear();
        /* 파라메터 체크 */
        console.log('* param1 (provider):.......' + init.provider);
        console.log('* param2 (web3 path):......' + init.web3);
        console.log('* param3 (owner account):..' + process.argv[2]);
        console.log('* param4 (owner password):.' + process.argv[3]);
        await HaltCrwodSale();
        if (result_sale != 0) {
            console.log('crowd sale result is success ......');
            await createToken();
            await deployRoadmap();
        } else {
            console.log('crowd sale result is failed ......');
            await refundCRP();           
        }
    } catch (err) {}
}
RunProc();