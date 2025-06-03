// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {CondominiumLib as Lib} from "./CondominiumLib.sol";

interface ICondominium {

    function addResident(address resident, uint16 residenceId) external;
    
    function removeResident(address resident) external;
    
    function setCounselor(address resident, bool isEntering) external;

//todo: mudar setManager
//    function setManager(address newManager) external;
    //todo: mudar addTopic
    function addTopic(string memory title, string memory description, Lib.Category category,uint amount, address responsible) external;
    
    //todo: criar o edit Topic
    
    function removeTopic(string memory title) external; 

    //todo: criar setquota mensal

    function openVoting(string memory title) external; 
    
    function vote(string memory title, Lib.Options option) external;
    
    function closeVoting(string memory title) external; 
    
    //todo: pay quota mensal

    //todo: transfer 
  
//    function numberOfVotes(string memory title) external;
}