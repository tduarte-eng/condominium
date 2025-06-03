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
    mapping(address => uint16) public residents; //Wallets mapeadas em => unidades do condominio (1-101) (2-505)  
    mapping(address => bool) public counselors; //Carteiras pertecentes ao Conselho    

    
    //Cada topico da reunião vai ter um identificador único = Hash do titulo do topico   
    mapping(bytes32 => Lib.Topic) public topics;
    mapping(bytes32 => Lib.Vote[]) public votings;

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
        require(tx.origin == manager || counselors[tx.origin], "This Only the manager or Counselors can do this");
        _;
    }

    modifier onlyResidents(){
        require(tx.origin == manager || isResident(tx.origin), "Only the manager or the residents can do this");
        _;
    }
    
    //Verifica se a Residencia exsite
    function residenceExists(uint16 residenceId) public view returns (bool){
        return residences[residenceId]; 
    }
    
    //Verifica se é um residente
    function isResident(address resident) public view returns (bool){
        return residents[resident] > 0; 
    }

    function addResident(address resident, uint16 residenceId) external onlyCouncil{//Somente os onlyCouncil pode acessar
        require(residenceExists(residenceId), "This residence does not exists");
        residents[resident] = residenceId;
    }

    function removeResident(address resident) external onlyManager{//Somente o Presidente pode excluir um residente
        require(!counselors[resident], "A counselor cannot be removed");//Se for do Conselho não pode ser excluido
        delete residents[resident];

        if (counselors[resident]) delete counselors[resident];
    }

    function setCounselor(address resident, bool isEntering) external onlyManager {
        if(isEntering){
            require(isResident(resident), "The counselor must be a resident");
            counselors[resident] = true;
        } else delete counselors[resident]; 
    }

    function setManager(address newManager) external onlyManager {
        require(newManager != address(0), "The address must be valid");
        manager = newManager;
    }   

    function getTopic(string memory title) public view returns (Lib.Topic memory){
        bytes32 topicId = keccak256(bytes(title));
        return topics[topicId];
    }

    function topicExists(string memory tile) public view returns (bool){
        return getTopic(tile).createdDate > 0; //Se for maior que Zero existe
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

        topics[keccak256(bytes(title))] = newTopic;
    }

    function removeTopic(string memory title) external onlyManager{
        Lib.Topic memory topic = getTopic(title);
        require (topic.createdDate > 0, "The topic does not exists");
        require( topic.status == Lib.Status.IDLE, "Only IDLE topics can be removed");
        delete topics[keccak256(bytes(title))];
    }

    function openVoting(string memory title) external onlyManager{
        Lib.Topic memory topic = getTopic(title);
        require(topic.createdDate > 0, "The topic does not exists");
        require(topic.status == Lib.Status.IDLE, "Only IDLE topics can be open for voting");

        bytes32 topicId = keccak256(bytes(title));
        topics[topicId].status = Lib.Status.VOTING;
        topics[topicId].startdDate = block.timestamp;
    }

    function vote(string memory title, Lib.Options option) external onlyResidents{
        require(option != Lib.Options.EMPTY, "The option cannot be EMPTY");

        Lib.Topic memory topic = getTopic(title);

        require(topic.createdDate > 0, "The topic does not exists");
        require(topic.status == Lib.Status.VOTING, "Only VOTING topics can be voted");

        uint16 residence =  residents[tx.origin];
        bytes32 topicId = keccak256(bytes(title));

        Lib.Vote[] memory votes = votings[topicId];
        for(uint8 i=0; i < votes.length; i++){
            if(votes[i].residence == residence)
                require(false, "A residence should vote only once");
        }

        Lib.Vote memory newVote = Lib.Vote({
            residence: residence,
            resident: tx.origin,
            option: option,
            timestamp: block.timestamp
        });

        votings[topicId].push(newVote);    
    }

    function closeVoting(string memory title) external onlyManager{
        Lib.Topic memory topic = getTopic(title);
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

        Lib.Vote[] memory votes = votings[topicId];
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
        
        topics[topicId].status = newStatus;
        topics[topicId].endDate = block.timestamp;

        if(newStatus ==  Lib.Status.APPROVED){
            if(topic.category == Lib.Category.CHANGE_QUOTA){
                monthlyQuota = topic.amount;    
            }
            else if(topic.category == Lib.Category.CHANGE_MANAGER){
                manager = topic.responsible;
            }
        }

    }

    function numberOfVotes(string memory title) public view returns(uint256){
        bytes32 topicId = keccak256(bytes(title));
        return votings[topicId].length;
    }

}

