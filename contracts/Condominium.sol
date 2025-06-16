// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "./ICondominium.sol";
import {CondominiumLib as Lib} from "./CondominiumLib.sol";

contract Condominium is ICondominium {
    address public manager; //ownable dono do contrato    
    uint public monthlyQuota = 0.01 ether;

    mapping(uint16 => bool) public residences;// unidade => true unidade mapeada se existe ou não no condominio

    Lib.Resident[] public residents;
    mapping(address => uint) private _residentIndex; //Wallets mapeadas em => unidades do condominio (1-101) (2-505)  

    address[] public counselors; //Carteiras pertecentes ao Conselho    
 
    
    mapping(uint16 => uint) private _nextPayment;//unidade => ultimo pagamento (timestamp)

    //Cada topico da reunião vai ter um identificador único = Hash do titulo do topico   
    Lib.Topic[] public topics;
    mapping(bytes32 => uint) private _topicIndex;
    mapping(bytes32 => Lib.Vote[]) private _votings;

    uint private constant _thirtyDays = 30 * 24 * 60 * 60;
    
    
    constructor(){
        manager = tx.origin; // Presidente do Condominio que faz o Deploy do Contrato
        for(uint16 i=1; i<=2; i++){//os blocos - no exemplo são dois blocos
            for(uint16 j=1; j<=5; j++){//os andares são cinco andares no exemplo
                for(uint16 k=1; k<=5; k++){//as unidades -
                    unchecked{//IJK podem estourar a memmoria unckecked é utilizado qdo vc tem certeza que não vai dar problema e sinaliza pra o teste
                        residences[(i*1000) + (j * 100) + k] = true;
                    }
                }
            }
        }
    }

    //MODIFIER: São testes para limitar as funções 
    modifier onlyManager(){
        require(tx.origin == manager, "Only the manager can do this");
        _;
    }
    
    modifier onlyCouncil(){
        require(tx.origin == manager || _isCounselor(tx.origin),
         "This Only the manager or Counselors can do this");
        _;
    }



    modifier onlyResidents(){
        if (tx.origin != manager) {
            require(
                tx.origin == manager || isResident(tx.origin),
                "Only the manager or the residents can do this");
            
            Lib.Resident memory resident = _getResident(tx.origin);
            require(
                tx.origin == manager || block.timestamp <= 
                    resident.nextPayment,
                "The resident must be defaulter");
        }
        _;

    }

    modifier validAddress(address addr){
        require(addr != address(0), "Invalid address");
        _;
    }


    //Verifica se a Residencia exsite
    function residenceExists(uint16 residenceId) public view returns (bool){
        return residences[residenceId]; 
    }
    
    //Verifica se é um residente
    function isResident(address resident) public view returns (bool){
        return _getResident(resident).residence > 0; 
    }

    function addResident(address resident, uint16 residenceId) external 
        onlyCouncil
        validAddress(resident)
    {//Somente os onlyCouncil pode acessar
        require(residenceExists(residenceId), "This residence does not exists");
        residents.push(Lib.Resident({
            wallet: resident,
            residence: residenceId,
            isCounselor: false,
            isManager: resident == manager,
            nextPayment: 0 
        }));
        _residentIndex[resident] = residenceId - 1;
    }

    function removeResident(address resident) external onlyManager{//Somente o Presidente pode excluir um residente
        require(!_isCounselor(resident), "A counselor cannot be removed");//Se for do Conselho não pode ser excluido
        uint index = _residentIndex[resident];

        if(index != residents.length - 1){
            Lib.Resident memory latest = residents[residents.length -1];
            residents[index] = latest;
            _residentIndex[latest.wallet] = index;
        }

        residents.pop();
        delete _residentIndex[resident];
    }


   function _getResident(address resident) private view returns (Lib.Resident memory) {
        uint index = _residentIndex[resident];
        if(index < residents.length){
            Lib.Resident memory result = residents[index];
            if(result.wallet == resident){ 
                result.nextPayment = _nextPayment[result.residence];
                return result;
            }
        } 
        return Lib.Resident({
            wallet: address(0),
            residence: 0,
            isCounselor: false,
            isManager: false,
            nextPayment: 0
        });
   }

   function getResident(address resident) external view returns (Lib.Resident memory) {
        return _getResident(resident);
   }

   function getResidents(
    uint page, 
    uint pageSize) external view returns (Lib.ResidentPage memory){
        Lib.Resident[] memory result = new Lib.Resident[](pageSize);
        uint skip = ((page -1) * pageSize);
        uint index = 0;

        for( 
            uint i=skip; i 
            < (skip + pageSize) && i < residents.length;
            i++
        ) {  
            result[index++] = _getResident(residents[i].wallet);
        }

        return Lib.ResidentPage({
            residents: result,
            total:  residents.length
        });
   
    }


    function _addCounselor(address counselor) private onlyManager validAddress(counselor){
        require(isResident(counselor), "The counselor must be a resident");
        counselors.push(counselor);
        residents[_residentIndex[counselor]].isCounselor = true;

    }

    function _removeCounselor(address counselor) private onlyManager validAddress(counselor) {
        uint index = 100000;
        for (uint i = 0; i < counselors.length; i++) {
            if(counselors[i] == counselor){
                index = i;
                break;
            }
        }

        require(index != 100000, "Counselor not found");

        if(index != counselors.length - 1){
            address latest = counselors[counselors.length - 1];
            counselors[index] = latest;
        }
        counselors.pop();
        residents[_residentIndex[counselor]].isCounselor = false;
    }

    function setCounselor(address resident, bool isEntering) external {
        if(isEntering){
            _addCounselor(resident);
        } else _removeCounselor(resident); 
    }

    function _isCounselor(address resident) private view returns (bool) {
        for(uint i=0; i< counselors.length; i++){
            if(counselors[i] == resident) return true;
        }
        return false;
    }
//    function setManager(address newManager) external onlyManager {
//        require(newManager != address(0), "The address must be valid");
//        manager = newManager;
//    }   

    function getTopic(string memory title) external view returns (Lib.Topic memory){
        return _getTopic(title);
    }

    function _getTopic(string memory title) private view returns (Lib.Topic memory){
        bytes32 topicId = keccak256(bytes(title));
        uint index = _topicIndex[topicId];

        if(index < topics.length){
            Lib.Topic memory result = topics[index];
            if (index > 0 || keccak256(bytes(result.title)) == topicId)
                return result;
        }


        return Lib.Topic({
            title: "",
            description: "",
            status: Lib.Status.DELETED,
            createdDate: 0,
            startdDate: 0,
            endDate:0,
            responsible: address(0),
            amount:0,
            category: Lib.Category.DECISION
        });
    }

    function topicExists(string memory tile) public view returns (bool){
        return _getTopic(tile).createdDate > 0; //Se for maior que Zero existe
    }
    
    function addTopic(string memory title, 
        string memory description, 
        Lib.Category category,
        uint amount,
        address responsible
    ) external onlyResidents {
        require(!topicExists(title), "This topic already exists");
        if(amount > 0){
            require(category == Lib.Category.CHANGE_QUOTA || category == Lib.Category.SPENT, "Wrong category");
        }

        Lib.Topic memory newTopic = Lib.Topic({
            title: title,
            description: description,
            createdDate: block.timestamp,
            startdDate: 0,
            endDate: 0,
            status: Lib.Status.IDLE,
            category: category,
            amount: amount,
            responsible: responsible != address(0) ? responsible : tx.origin
        });

        _topicIndex[keccak256(bytes(title))] = topics.length;
        topics.push(newTopic);
    }

    function removeTopic(string memory title) external onlyManager returns (Lib.TopicUpdate memory){
        Lib.Topic memory topic =_getTopic(title);
        require (topic.createdDate > 0, "The topic does not exists");
        require( topic.status == Lib.Status.IDLE, "Only IDLE topics can be removed");
        
        bytes32 topicId = keccak256(bytes(title)); 
        uint index = _topicIndex[topicId];

        if(index != topics.length -1){
            Lib.Topic memory latest = topics[topics.length -1];
            topics[index] = latest;
            _topicIndex[keccak256(bytes(latest.title))] = index;   
        }

        topics.pop();
        delete _topicIndex[topicId];


        return Lib.TopicUpdate({
            id: topicId,
            title: topic.title,
            category: topic.category,
            status: Lib.Status.DELETED
        });   
    }

    function editTopic(string memory topicToEdit, 
        string memory description,
        uint amount,
        address responsible) 
        external onlyManager returns (Lib.TopicUpdate memory) {
        
        Lib.Topic memory topic =_getTopic(topicToEdit);
        require(topic.createdDate > 0, "This topic does not exists");
        require(topic.status == Lib.Status.IDLE, "Only IDLE topics can be edited");

        bytes32 topicId = keccak256(bytes(topicToEdit));
        uint index = _topicIndex[topicId];


        if(bytes(description).length > 0)
            topics[index].description = description;
        if(amount >= 0)
            topics[index].amount = amount;
        if(responsible != address(0))
            topics[index].responsible = responsible;

        return Lib.TopicUpdate({
            id: topicId,
            title: topic.title,
            category: topic.category,
            status: topic.status
        });   
    }

    function getTopics(
    uint page, 
    uint pageSize) external view returns (Lib.TopicPage memory){
        Lib.Topic[] memory result = new Lib.Topic[](pageSize);
        uint skip = ((page -1) * pageSize);
        uint index = 0;

        for( 
            uint i=skip; i 
            < (skip + pageSize) && i < topics.length;
            i++
        ) {  
            result[index++] = topics[i];
        }

        return Lib.TopicPage({
            topics: result,
            total:  topics.length
        });
   
    }




    function openVoting(string memory title) external onlyManager returns (Lib.TopicUpdate memory){
        Lib.Topic memory topic =_getTopic(title);
        require(topic.createdDate > 0, "The topic does not exists");
        require(topic.status == Lib.Status.IDLE, "Only IDLE topics can be open for voting");

        bytes32 topicId = keccak256(bytes(title));
        uint index = _topicIndex[topicId];

        topics[index].status = Lib.Status.VOTING;
        topics[index].startdDate = block.timestamp;


        return Lib.TopicUpdate({
            id: topicId,
            title: topic.title,
            category: topic.category,
            status: Lib.Status.VOTING
        });   
    }

    function vote(string memory title, Lib.Options option) external onlyResidents{
        require(option != Lib.Options.EMPTY, "The option cannot be EMPTY");

        Lib.Topic memory topic =_getTopic(title);

        require(topic.createdDate > 0, "The topic does not exists");
        require(topic.status == Lib.Status.VOTING, "Only VOTING topics can be voted");

        uint16 residence =  residents[_residentIndex[tx.origin]].residence;
        bytes32 topicId = keccak256(bytes(title));

        Lib.Vote[] memory votes = _votings[topicId];
        for(uint8 i=0; i < votes.length; i++){
            require(
                votes[i].residence != residence,
                "A residence should vote only once"
            );
        }

        Lib.Vote memory newVote = Lib.Vote({
            residence: residence,
            resident: tx.origin,
            option: option,
            timestamp: block.timestamp
        });

        _votings[topicId].push(newVote);    
    }

    function closeVoting(string memory title) external onlyManager returns (Lib.TopicUpdate memory){
        Lib.Topic memory topic =_getTopic(title);
        require(topic.createdDate > 0, "The topic does not exists");
        require(topic.status == Lib.Status.VOTING, "Only VOTTING topics can be closed");

        uint8 minimumVotes = 5;

        if (topic.category == Lib.Category.SPENT) minimumVotes = 10;
        else if (topic.category == Lib.Category.CHANGE_MANAGER) minimumVotes = 15;
        else if (topic.category == Lib.Category.CHANGE_QUOTA) minimumVotes = 20;
            
        require(numberOfVotes(title)>= minimumVotes, "You cannot finish a voting whithout the minimum votes");

        uint8 approved = 0;
        uint8 denied = 0;
        uint8 abstentions = 0;
        bytes32 topicId = keccak256(bytes(title));

        Lib.Vote[] memory votes = _votings[topicId];
        for(uint8 i=0; i < votes.length; i++){
            if(votes[i].option == Lib.Options.YES)
                approved++;
            else if(votes[i].option == Lib.Options.NO)
                denied++;
            else
                abstentions++;    
        }    

        Lib.Status newStatus = approved > denied 
            ? Lib.Status.APPROVED
            : Lib.Status.DENIED;
        
        uint index = _topicIndex[topicId];
        topics[index].status = newStatus;
        topics[index].endDate = block.timestamp;

        if(newStatus ==  Lib.Status.APPROVED){
            if(topic.category == Lib.Category.CHANGE_QUOTA){
                monthlyQuota = topic.amount;    
            }
            else if(topic.category == Lib.Category.CHANGE_MANAGER){
                if(isResident(manager))
                    residents[_residentIndex[manager]].isManager = false;
                
                manager = topic.responsible;

                if(isResident(topic.responsible))
                    residents[_residentIndex[topic.responsible]].isManager = true;    
            }
        }

        return Lib.TopicUpdate({
            id: topicId,
            title: topic.title,
            category: topic.category,
            status: newStatus
        });   
    }

    function numberOfVotes(string memory title) public view returns(uint256){
        bytes32 topicId = keccak256(bytes(title));
        return _votings[topicId].length;
    }

    function getVotes(string memory topicTitle) external view returns (Lib.Vote[] memory){
        return _votings[keccak256(bytes(topicTitle))];
    }

    function payQuota(uint16 residenceId) external payable {
        require(residenceExists(residenceId), "The residence does not exists");
        require(msg.value >= monthlyQuota, "Wrong value");
        require(block.timestamp > _nextPayment[residenceId], "You cannot pay twice a month");

        
        if(_nextPayment[residenceId] == 0)
            _nextPayment[residenceId] = block.timestamp + _thirtyDays;
        else  _nextPayment[residenceId] += _thirtyDays;
    }

    function transfer(string memory topicTitle, uint amount) external onlyManager returns (Lib.TransferReceipt memory) {
        require(address(this).balance >= amount, "Insufficient funds");
        
        Lib.Topic memory topic =_getTopic(topicTitle);
        require(topic.status == Lib.Status.APPROVED &&
         topic.category == Lib.Category.SPENT, "Only APPROVED SPENT topics can be used for transfers"); 
        require(topic.amount >=  amount, "The amount muste be less or equal the APPROVED topic");
        
        payable(topic.responsible).transfer(amount);
        bytes32 topicId = keccak256(bytes(topicTitle));
        uint index = _topicIndex[topicId];
        topics[index].status = Lib.Status.SPENT;
        
        return Lib.TransferReceipt({
            to: topic.responsible,
            amount: amount,
            topic: topicTitle
        });

        }

    function getManager() external view returns (address){
        return manager;
    }

    function getQuota() external view returns (uint){
        return monthlyQuota;
    }



}


