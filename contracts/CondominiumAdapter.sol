// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./ICondominium.sol";

contract CondominiumAdapter {
    
    ICondominium private implementation;
    //Interessante criar um conselho para atualizar o endereço. No caso abaixo somente o Owner do contrato pode modificar 
    address public immutable owner;

    constructor(){
        owner = msg.sender;
    }  

    function getImplAddress() external view returns (address){
        return address(implementation);
    }

    function upgrade(address newImplementation) external {
        require(msg.sender == owner, "You do not have permission");
        implementation = ICondominium(newImplementation);    
    }

    function addResident(address resident, uint16 residenceId) external{
        return implementation.addResident(resident, residenceId);
    }

    function removeResident(address resident) external {
        return implementation.removeResident(resident);        
    }

    function setCounselor(address resident, bool isEntering) external{
        return implementation.setCounselor(resident, isEntering);
    }

    //todo: mudar setManager
//    function setManager(address newManager) external{
//        return implementation.setManager(newManager);
//    }

    //todo: mudar addTopic
    function addTopic(string memory title, string memory description, Lib.Category category, uint amount) external{
        return implementation.addTopic(title, description, category, amount);
    }
    
    //todo: criar o edit Topic
    
    function removeTopic(string memory title) external{
        return implementation.removeTopic(title);
    }

    //todo: criar setquota mensal

    function openVoting(string memory title) external{
        return implementation.openVoting(title);
    } 
    
    function vote(string memory title, Lib.Options option) external{
        return implementation.vote(title, option);
    }
    
    function closeVoting(string memory title) external{
        return implementation.closeVoting(title);
    }
    
    //todo: pay quota mensal

    //todo: transfer 
  
//    function numberOfVotes(string memory title) external;

}