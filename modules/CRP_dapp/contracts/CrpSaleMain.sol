pragma solidity ^ 0.4 .24;

import "./SafeMath.sol";
import "./CrpInfc.sol";
import "./CrpFund.sol";

/// @title the CRP crowdsale contract (version 0.1)
/// @author jhhong & sykang4966@gmail.com
contract CrpSaleMain is CrpInfc {
    using SafeMath
    for uint;

    // struct: 계정 별 토큰 구매 목록 관리
    struct SaleInfo {
        bool exist; // 구매 여부
        address account; // 계정
        uint amount; // 송금한 이더리움 양
        uint balance; // 교환된 토큰 양액
        address prev;
        address next;
    }

    // public variableuin  

    uint public total_CRP; // 총 모금된 CRP
    uint public total_staff_CRP; // 스탭 할당 CRP
    uint public sale_started; //세일 시작시간
    uint public sale_ended; // 세일 종료시간    
    address public chain_head; // 세일 체인 머리
    address public chain_last; // 세일 체인 꼬리
    uint public chain_count; // 체일 체인 목록번호
    address public main_address; // 메인컨트렉트 주소
    uint public found_rate; // 크라우드세일 교환 비율
    uint256 public softcap; // 소프트캡 금액
    uint256 public hardcap; // 하드캡 금액
    uint public ceiling; // 총 판매 이더
    uint public crp_max; // 1계좌당 보낼수 있는 최대 갯수
    uint public crp_min; // 전송가능한 최소 이더리움 갯수
    uint public default_ratio; //기본 교환 비율
    address public owner; // 오너 계좌
    CrpFund public fund_contract; // fund contract 주소
    uint public init_amount; // 초기 인출액
    string constant contract_type = "SALEMAIN";


    // private variable
    mapping(address => SaleInfo) sales; // 계정 별 세일 정보 관리

    // events
    event SaleStarted(uint _ceiling, uint _duration); // 세일 시작 이벤트 (v2)
    event SaleEnded(uint _ceiling, uint _elapsed); // 세일 만료 이벤트 (v2)
    event SaleHalted(uint _elapsed); // 세일 종료 이벤트 (v2)
    event FundSaled(address _purchaser, uint _amount, uint _rests, uint _elapsed, uint _ratio); // 펀드 전송 완료 이벤트

    //modifier
    modifier isValidPayload() { // 지불 가능한지
        require(crp_max == 0 || msg.value < crp_max + 1);
        require(crp_min == 0 || msg.value > crp_min - 1);
        _;
    }
    modifier isProjectOwner(address _address) { // 토큰 owner인지 검사
        require(_address == owner);
        _;
    }

    /// @author sykang
    /// @notice the contructor of crpCrowdSale    
    /// @param _start_sale the start time crowdsale
    /// @param _end_sale the end time crowdsale
    /// @param _softcap Minimum amount of progress
    /// @param _hardcap maxmum amount of progress
    /// @param _found_rate fund rasing rate
    /// @param _max Maximum transferable amount per wallet
    /// @param _min minimum transferable amount per wallet
    /// @param _ratio token exchange rate
    /// @param _init init fund
    /// @param _main CrpMainContract
    constructor
        (uint _start_sale, uint _end_sale, uint256 _softcap, uint256 _hardcap, uint _found_rate, uint _max, uint _min, uint _ratio, uint _init, address _main, address _fund)
    public {
        sale_started = _start_sale;
        sale_started = now;
        sale_ended = _end_sale;
        sale_ended = sale_started+600;
        softcap = _softcap;
        hardcap = ceiling = _hardcap;
        found_rate = _found_rate;
        crp_max = _max;
        crp_min = _min;
        default_ratio = _ratio;
        init_amount = _init;
        main_address = _main;
        fund_contract = CrpFund(_fund);
        chain_count = 0;
        owner = msg.sender;
    }

    /// @author sykang
    /// @notice interface, return contract type
    /// @return const variable of contract_type
    function getContractType()
    public view
    returns(string) {
        return contract_type;
    }

    function getSaleEnded()
    public view
    returns(uint) {
        return sale_ended;
    }

    /// @author sykang
    /// @notice The fallback function that is called when account sends ether to the contract address
    function buyToken()    
    isValidPayload() // 수취 금액 검증
    payable public {
        //\
        //require(sale_started < now && sale_ended > now);
        require(ceiling > 0); // 남은 금액

        uint256 refund= 0; // 환불금액

        uint256 exchanges = 1; //교환비율
        uint256 amount = msg.value; //입금금액

        if (amount > ceiling) {
            refund= amount.sub(ceiling);
            amount = ceiling;
        } //남은 토큰 양이 입금 양 보다 적을 경우

        total_CRP = total_CRP.add(amount); // 총 판매 CRP
        exchanges = amount.mul(default_ratio); //총 판매 토큰, CRP * RATIO
        ceiling = ceiling.sub(amount); // 남은 판매 토큰 재고

        updateSaleInfo(msg.sender, amount, exchanges); // 정보 업데이트

        if (refund > 0) {
            msg.sender.transfer(refund);
        }
    }

    /// @author jhhong, sykang
    /// @notice update variable "sales"
    /// @dev if "_sender" purchase first, crowdsale lock "_sender" not to transfer tokens
    /// v2: delete "token_obj.setAddressLock()", and add "buyer.push()"
    /// @param _sender the account address who send ethereum for purchasing tokens
    /// @param _amount the amount of ethereum for "_sender" to send
    /// @param _exchanges the amount of tokens for "_sender" to be received
    function updateSaleInfo(address _sender, uint _amount, uint _exchanges)
    private {
        require(_sender != 0);

        SaleInfo storage crowd_data = sales[_sender];

        if (crowd_data.exist == true) {
            require(crowd_data.account == _sender);
            crowd_data.amount = crowd_data.amount.add(_amount);
            crowd_data.balance = crowd_data.balance.add(_exchanges);
        } else {
            if (chain_count == 0) {
                chain_head = chain_last = _sender;
            }
            crowd_data.exist = true;
            crowd_data.account = _sender;
            crowd_data.amount = _amount;
            crowd_data.balance = _exchanges;
            sales[chain_last].next = _sender;
            sales[_sender].prev = chain_last;
            chain_last = _sender;
            chain_count = chain_count.add(1);
        }
        sales[_sender] = crowd_data;
    }

    /// @author sykang
    /// @notice terminate the crowdsale
    /// @dev call only crowdsale owner
    function saleHalt()
    isProjectOwner(msg.sender)
    public{
        //require(sale_ended<now);
        require(msg.sender == owner);

        if (total_CRP < softcap) { // 환불 기능
            total_staff_CRP = 0;
        } else { /// 토큰 생성 기능                           
            ceiling = 0; // 판매금액 재 선언
            total_staff_CRP = ((softcap.mul(default_ratio)).mul(found_rate)).div(100); 
        }
    }

    ///@author sykang
    ///@notice withdraw to fund
    function TransferFund()
    isProjectOwner(msg.sender)
    payable public{
        fund_contract.receiveCrp.value(address(this).balance)();
        //fund_address.transfer(address(this.balance));
    }

    /// @author sykang
    /// @notice refund crowdfund and return next buyer address
    /// @return return address of next buyer
    function refund(address _addr)
    isProjectOwner(msg.sender)
    public {
        require(msg.sender == owner);
        _addr.transfer(sales[_addr].amount);
    }

    /// @author sykang
    /// @notice get Next address
    /// @param _addr return this _addr's next address 
    /// @return return address of next buyer
    function getNextAddr(address _addr)
    public view
    returns(address) {
        return sales[_addr].next;
    }

    /// @author jhhong
    /// @notice get token balances purchased by "_src"
    /// @param _src token balances purchased by "_src" (uint)
    /// @return the amount of token purchased by "_src" (uint256)
    function balanceOf(address _src)
    public view returns(uint256) {
        return sales[_src].balance;
    }
    /// @author jhhong
    /// @notice get ethereums transfered by "_src"
    /// @param _src ethereums transfered by "_src" (uint)
    /// @return the amount of ethereum transfered by "_src" (uint256)
    function amountOf(address _src)
    public view returns(uint256) {
        return sales[_src].amount;
    }

    /// @author jhhong (v2)
    /// @notice get total chain_count of token buyer
    /// @return total chain_count of token buyer (uint)
    function numOfBuyer()
    public view returns(uint) {
        return chain_count;
    }
}