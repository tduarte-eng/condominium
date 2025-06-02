// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

library CondominiumLib {


    //Enumerador do STATUS da votação de um topico
    enum Status {
        IDLE,//ocioso
        VOTING,//Em votacao
        APPROVED,//Aprovado
        DENIED
    }//0,1,2,3

    enum Options {
        EMPTY,//ocioso
        YES,//Em votacao
        NO,//Aprovado
        ABSTENTION
    }//0,1,2,3

    struct Topic{
        string title;
        string description;
        Status status;
        uint256 createdDate;
        uint256 startdDate;
        uint256 endDate;        
    }

    struct Vote{
        address resident;
        uint16 residence;
        Options option;
        uint256 timestamp;
    }

}