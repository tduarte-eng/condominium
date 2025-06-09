// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

library CondominiumLib {


    //Enumerador do STATUS da votação de um topico
    enum Status {
        IDLE,//ocioso
        VOTING,//Em votacao
        APPROVED,//Aprovado
        DENIED,
        DELETED,
        SPENT
    }//0,1,2,3

    //Quais opções que podem ser votados
    enum Options {
        EMPTY,//Nao votar
        YES,
        NO,
        ABSTENTION
    }//0,1,2,3

    enum Category {
        DECISION,//Nao votar
        SPENT,
        CHANGE_QUOTA,
        CHANGE_MANAGER
    }//0,1,2,3

    struct Topic{
        string title;
        string description;
        Status status;
        uint256 createdDate;
        uint256 startdDate;
        uint256 endDate;
        Category category;
        uint amount;
        address responsible;        
    }

    struct Vote{
        address resident;
        uint16 residence;
        Options option;
        uint256 timestamp;
    }

    struct TopicUpdate{
        bytes32 id;
        string title;
        Status status;
        Category category;
    }

    struct TransferReceipt {
        address to;
        uint amount;
        string topic;
    }

}