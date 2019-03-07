pragma solidity ^ 0.4 .24;

import "./SafeMath.sol";
import "./CrpInfc.sol";

/// @title the roadMapPoll contract (version 0.1)
/// @author sykang@gmail.com
contract CrpPollRoadmap is CrpInfc {
    using SafeMath
    for uint;

    // struct : 계정 별 투표 목록 관리
    struct Vote {
        uint time; // 투표 시간
        uint weight; // 투표 양
        bool agree; // 찬반 여부
        address prev;
        address next;
    }

    // public variable    
    uint public agree_ballot; // 찬성 표
    uint public agree_addr; // 찬성 계좌
    uint public disagree_addr; // 반대계좌
    uint public total_poll; // 투표 수
    uint public total_weight; // 투표 량
    uint public poll_started; // 투표 시작 시간
    uint public poll_ended; // 투표 종료 시간
    bool public result_poll; // 투표 결과   
    address public main_contract;
    address public owner; // 오너 계좌
    address public head;
    address public last;
    uint public total_addr;
    string constant contract_type = "POLLROADMAP";

    mapping(address => Vote) vote_info; //투표 정보 맵핑

    modifier isProjectOwner(address _address) { // 토큰 owner인지 검사
        require(_address == owner);
        _;
    }

    /// @author sykang
    /// @notice the constructor of crpPoll contract    
    /// @param _start_time the start time this poll
    /// @param _end_time the end tiem this poll
    /// @param _main the address of CrpToken contract
    constructor(uint _start_time, uint _end_time, address _main)
    public {
        owner = msg.sender;
        poll_started = _start_time;
        poll_started = now;
        poll_ended = _end_time;
        poll_ended = poll_started + 600;
        main_contract = _main;
    }

    /// @author sykang
    /// @notice interface, return contract type
    /// @return const variable of contract_type
    function getContractType()
    public view
    returns(string) {
        return contract_type;
    }

    /// @author sykang
    /// @notice return vote_info element by _addr
    /// @param _addr check _addr
    /// @return vote_info element
    function getVoteInfo(address _addr)
    public view
    returns(uint, uint, bool, address, address) {
        return (vote_info[_addr].time, vote_info[_addr].weight, vote_info[_addr].agree, vote_info[_addr].prev, vote_info[_addr].next);
    }

    /// @author sykang
    /// @notice polling by attended crowdSale
    /// @param _vote Votes of voters  (bool)
    function polling(uint _vote) public {
        //require(now>poll_started && now<poll_ended);
        require(vote_info[msg.sender].time == 0);

        bool agree;
        if (_vote == 0) {
            agree = false;
        } else if (_vote == 1) {
            agree = true;
        }

        if (head == address(0)) {
            head = last = msg.sender;
        } else {
            vote_info[last].next = msg.sender;
            vote_info[msg.sender].prev = last;
            last = msg.sender;
        }

        if (agree) { //찬성
            agree_addr = agree_addr.add(1);
        } else { //반대
            disagree_addr = disagree_addr.add(1);
        }
        vote_info[msg.sender].agree = agree;
        vote_info[msg.sender].time = now;
    }

    /// @author sykang
    /// @notice cancle polled record by attended crowdSale
    function cancelPoll()
    public {
        require(vote_info[msg.sender].time != 0);
        //require(now>poll_started && now<poll_ended);  

        bool voted = vote_info[msg.sender].agree;
        if (voted) {
            agree_addr = agree_addr.sub(1);
        } else {
            disagree_addr = disagree_addr.sub(1);
        }
        vote_info[msg.sender].time = 0;
    }

    function setAmount(address _addr, uint _amount)
    public {
        vote_info[_addr].weight = _amount;
    }

    /// @author sykang
    /// @notice Settle the results of a vote
    /// @param _addr_count total token account
    /// @param _total_token total token amount
    /// @param _total_agree total agree token
    function settlePoll(uint _addr_count, uint _total_token, uint _total_agree)
    isProjectOwner(msg.sender)
    public {
        //require(now > poll_ended);
        total_addr = _addr_count;
        total_weight = _total_token;
        agree_ballot = _total_agree;

        uint tmp = (total_addr.mul(7)).div(10); // 70% 계좌수
        uint tmp_total = agree_addr.add(disagree_addr); //  전체 투표자 수

        if (tmp > tmp_total) { // 투표율이 70% 이하
            result_poll = false;
        } else {

            tmp_total = (tmp_total.mul(7)).div(10); // 전체 투표자 수에 70%
            if (tmp_total > agree_addr) { // 찬성 투표자 수가 전체 투표자 수의 70%이하
                result_poll = false;
            } else {
                uint tmp_poll = (total_weight.mul(7)).div(10); // 전체 투표에 참가한 토큰 수의 70%
                if (tmp_poll > agree_ballot) { // 찬성 보유량이 70% 이하
                    result_poll = false;
                }
            }
        }
        result_poll = true;
    }
}