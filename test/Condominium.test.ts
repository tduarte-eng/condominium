import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Condominium } from "../typechain-types";
import { SignertWithAddress } from "@nomicfoundation/hardhat-ethers/signers";


describe("Condominium", function () {

    enum Options {
        EMPTY = 0,//ocioso
        YES = 1,//Em votacao
        NO = 2,//Aprovado
        ABSTENTION = 3
    }//0,1,2,3

    enum Status {
        IDLE = 0,//ocioso
        VOTING = 1,//Em votacao
        APPROVED = 2,//Aprovado
        DENIED = 3,
        SPENT = 4
    }//0,1,2,3


    enum Category {
        DECISION = 0,//Nao votar
        SPENT = 1,
        CHANGE_QUOTA = 2,
        CHANGE_MANAGER = 3
    }//0,1,2,3
    
    async function addResidents(contract: Condominium, count: number, accounts: SignerWithAddress[]){
      for(let i=1; i <= count; i++){
        const residenceId = (1000 * Math.ceil(i / 25)) + (100 * Math.ceil(i/5)) + (i - (5 * Math.floor((i - 1) /5)));
        await contract.addResident(accounts[i-1].address, residenceId);
        
        const instance = contract.connect(accounts[i-1]);
        await instance.payQuota(residenceId, {value: ethers.parseEther("0.01")});
 
      } 
    }

    async function addVotes(contract: Condominium, count: number, accounts: SignerWithAddress[], shouldApprove: boolean=true){
      for(let i=1; i <= count; i++){
        const instance = contract.connect(accounts[i-1]);
        await instance.vote("topic 1", shouldApprove ? Options.YES : Options.NO); 
      } 
    }

    async function deployFixture() {
    
    const accounts = await hre.ethers.getSigners();
    const manager = accounts[0];
    

    const Condominium = await hre.ethers.getContractFactory("Condominium");
    const contract = await Condominium.deploy();

    return { contract, manager, accounts };
  }

  it("Should be residence", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      expect(await contract.residenceExists(2102)).to.equal(true);
  });

  it("Should add resident", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addResident(accounts[1].address, 2102);
      
      expect(await contract.isResident(accounts[1].address)).to.equal(true);
  });

  it("Should NOT add resident (address)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
        
      await expect(contract.addResident(ethers.ZeroAddress, 2102)).to.be.revertedWith("Invalid address");
  });

  it("Should NOT add resident", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const instance = contract.connect(accounts[1]); //
      await expect(instance.addResident(accounts[1].address, 2102)).to.be.revertedWith("This Only the manager or Counselors can do this");
  });


  it("Should NOT add accounts(residence)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await expect(contract.addResident(accounts[1].address, 2132)).to.be.revertedWith("This residence does not exists");
  });

  it("Should remove resident", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addResident(accounts[1].address, 2102);
      await contract.removeResident(accounts[1].address);
      expect(await contract.isResident(accounts[1].address)).to.equal(false);
  });

  it("Should NOT remove accounts(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addResident(accounts[1].address, 2102);
      const instance = contract.connect(accounts[1]); //
      await expect(instance.removeResident(accounts[1].address)).to.be.revertedWith("Only the manager can do this");
  });

  it("Should NOT remove accounts(counselor)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addResident(accounts[1].address, 2102);
      
      await contract.setCounselor(accounts[1].address, true);
      await expect(contract.removeResident(accounts[1].address)).to.be.revertedWith("A counselor cannot be removed");
  });

  it("Should set counselor (true)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addResident(accounts[1].address, 2102);
      await contract.setCounselor(accounts[1].address, true);

      const instance = contract.connect(accounts[1]);  
      await instance.addResident(accounts[2].address, 1302);
        
      expect(await contract.counselors(accounts[1].address)).to.equal(true);
      expect(await contract.isResident(accounts[2].address)).to.equal(true);
  });

  it("Should set counselor (false)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addResident(accounts[1].address, 2102);
      await contract.setCounselor(accounts[1].address, true);

      await contract.setCounselor(accounts[1].address, false);

      
      expect(await contract.counselors(accounts[1].address)).to.equal(false);
  });

    it("Should NOT set counselor (address)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

     await expect(contract.setCounselor(ethers.ZeroAddress, true)).to.be.revertedWith("Invalid address");
  });

  it("Should NOT set counselor (permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addResident(accounts[1].address, 2102);
      const instance = contract.connect(accounts[1]);
      await expect(instance.setCounselor(accounts[1].address, true)).to.be.revertedWith("Only the manager can do this");
  });

  it("Should NOT set counselor (accounts[1])", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await expect(contract.setCounselor(accounts[1].address, true)).to.be.revertedWith("The counselor must be a resident");
  });

  it("Should change manager", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await addResidents(contract, 15, accounts);
      await contract.addTopic("topic 1", "description 1", Category.CHANGE_MANAGER, 0, accounts[1].address);
      await contract.openVoting("topic 1");

 
      await addVotes(contract,15, accounts);  

      await contract.closeVoting("topic 1");
      const topic = await contract.getTopic("topic 1");  
  
      expect(await contract.manager()).to.equal(accounts[1].address);
  });

  it("Should change quota", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await addResidents(contract, 20, accounts);
      const value = ethers.parseEther("0.02");
      await contract.addTopic("topic 1", "description 1", Category.CHANGE_QUOTA, value, manager.address);
      await contract.openVoting("topic 1");

 
      await addVotes(contract, 20, accounts);  

      await contract.closeVoting("topic 1");
     
  
      expect(await contract.monthlyQuota()).to.equal(value);
  });

//  it("Should NOT set manager (permission)", async function () {
//      const { contract, manager, accounts } = await loadFixture(deployFixture);
      
//      const instance = contract.connect(accounts[1]);
//      await expect(instance.setManager(accounts[1].address)).to.be.revertedWith("Only the manager can do this");
//  });

//  it("Should NOT set manager (address ilegal)", async function () {
//      const { contract, manager, accounts } = await loadFixture(deployFixture);
      
//      await expect(contract.setManager("0x0000000000000000000000000000000000000000")).to.be.revertedWith("The address must be valid");
//  });

  it("Should edit topic", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addTopic("topic 1", "description 1", Category.SPENT, 1, manager.address);
      await contract.editTopic("topic 1", "new description", 2, manager.address);
      const topic = await contract.getTopic("topic 1")
      
      expect(topic.description).to.equal("new description");
  });

  it("Should NOT edit topic (permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addTopic("topic 1", "description 1", Category.SPENT, 1, manager.address);
      
      const instance =contract.connect(accounts[1]);
      
      await expect(instance.editTopic("topic 1", "new description", 2, manager.address))
        .to.be.revertedWith("Only the manager can do this");
  });

  it("Should NOT edit topic (exists)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addTopic("topic 1", "description 1", Category.SPENT, 1, manager.address);
      
      await expect(contract.editTopic("topic 2", "new description", 2, manager.address))
        .to.be.revertedWith("This topic does not exists");
  });  

   it("Should NOT edit topic (status)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addTopic("topic 1", "description 1", Category.SPENT, 1, manager.address);
      
      await contract.openVoting("topic 1");
      await expect(contract.editTopic("topic 1", "new description", 2, manager.address))
        .to.be.revertedWith("Only IDLE topics can be edited");
  });  

  it("Should add topic (manager)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      expect(await contract.topicExists("topic 1")).to.equal(true);
  });

  it("Should NOT add topic (amount)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await expect(contract.addTopic("topic 1", "description 1", Category.DECISION, 10, manager.address)).
        to.be.revertedWith("Wrong category");
  });


  it("Should add topic (accounts[1])", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
 
      await addResidents(contract, 2, accounts);
      const instance = contract.connect(accounts[1]);
      await instance.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      expect(await contract.topicExists("topic 1")).to.equal(true);
  });

  it("Should NOT add topic (permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const instance = contract.connect(accounts[1]);
      expect(instance.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address))
        .to.be.revertedWith("Only the manager or the residents can do this");
  });  

  it("Should NOT add topic (Topic Exist)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await expect(contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address))
        .to.be.revertedWith("This topic already exists");
  });  

  it("Should remove topic", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.removeTopic("topic 1");
      expect(await contract.topicExists("topic 1")).to.equal(false);
  });

  it("Should NOT remove topic (permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      const instance = contract.connect(accounts[1]);
      await expect(instance.removeTopic("topic 1")).to.be.revertedWith("Only the manager can do this");
  });  

  it("Should NOT remove topic (Topic No Exist)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await expect(contract.removeTopic("topic 1")).to.be.revertedWith("The topic does not exists");
  });  

  it("Should NOT remove topic (STATUS)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1")//todo: função mudar status do topico
      await expect(contract.removeTopic("topic 1")).to.be.revertedWith("Only IDLE topics can be removed");
  });  

  it("Should Vote", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await addResidents(contract, 2, accounts);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1");
          
      const instance = contract.connect(accounts[1]);  
      await instance.vote("topic 1", Options.ABSTENTION);

      expect(await instance.numberOfVotes("topic 1")).to.equal(1);
      
  });

  it("Should NOT Vote (duplicated)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await addResidents(contract, 2, accounts);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1");
          
      const instance = contract.connect(accounts[1]);  
      await instance.vote("topic 1", Options.YES);

      await expect(instance.vote("topic 1", Options.YES)).to.be.revertedWith("A residence should vote only once");      
  });

  it("Should NOT Vote (defaulter)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addResident(accounts[1].address, 2102);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1");
          
      const instance = contract.connect(accounts[1]);  
      
      await expect(instance.vote("topic 1", Options.YES)).to.be.revertedWith("The resident must be defaulter");      
  });

  it("Should NOT Vote (status)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await addResidents(contract, 2, accounts);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
          
      const instance = contract.connect(accounts[1]);  

      await expect(instance.vote("topic 1", Options.YES)).to.be.revertedWith("Only VOTING topics can be voted");      
  });

  it("Should NOT Vote (exists)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await addResidents(contract, 2, accounts);
      const instance = contract.connect(accounts[1]);  

      await expect(instance.vote("topic 1", Options.YES)).to.be.revertedWith("The topic does not exists");      
  });

  it("Should NOT Vote (permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1");
          
      const instance = contract.connect(accounts[1]);  
      await expect(instance.vote("topic 1", Options.YES)).to.be.revertedWith("Only the manager or the residents can do this");
      
  });

  it("Should NOT Vote (empty)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await addResidents(contract, 2, accounts);
      //await contract.addResident(accounts[1].address, 2102);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1");
          
      const instance = contract.connect(accounts[1]);  

      await expect(instance.vote("topic 1", Options.EMPTY)).to.be.revertedWith("The option cannot be EMPTY");
      
  });

  it("Should Closed voting (YES)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await addResidents(contract, 5, accounts);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1");

 
      await addVotes(contract,5, accounts);  

      await contract.closeVoting("topic 1");
      const topic = await contract.getTopic("topic 1");  
  
      expect(topic.status).to.equal(Status.APPROVED);
      
  });

   it("Should Closed voting (NO)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await addResidents(contract, 6, accounts);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1");

 
      await addVotes(contract,5, accounts, false);  
      const instance = contract.connect(accounts[5]);
      await instance.vote("topic 1", Options.ABSTENTION);  

      await contract.closeVoting("topic 1");
      const topic = await contract.getTopic("topic 1");  
  
      expect(topic.status).to.equal(Status.DENIED);
      
  }); 

  it("Should NOT Closed voting (permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addResident(accounts[1].address, 2102);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1");

      const instance = contract.connect(accounts[1]);  

      await expect(instance.closeVoting("topic 1")).to.be.revertedWith("Only the manager can do this");
      
  });

  it("Should NOT Closed voting (minimum votes)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1");

      const instance = contract.connect(accounts[1]);  

      await expect(contract.closeVoting("topic 1")).to.be.revertedWith("You cannot finish a voting whithout the minimum votes");
      
  });

  it("Should NOT Closed voting (exists)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addResident(accounts[1].address, 2102);

      await expect(contract.closeVoting("topic 1")).to.be.revertedWith("The topic does not exists");
      
  });

  it("Should NOT Closed voting (status)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addResident(accounts[1].address, 2102);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);

      await expect(contract.closeVoting("topic 1")).to.be.revertedWith("Only VOTTING topics can be closed");
      
  });

  it("Should NOT open voting (permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addResident(accounts[1].address, 2102);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      const instance = contract.connect(accounts[1]);
      
      await expect(instance.openVoting("topic 1")).to.be.revertedWith("Only the manager can do this");
      
  });

  it("Should NOT open voting (status)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addResident(accounts[1].address, 2102);
      await contract.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await contract.openVoting("topic 1");
      
      await expect(contract.openVoting("topic 1")).to.be.revertedWith("Only IDLE topics can be open for voting");
      
  });

  it("Should NOT open voting (exists)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await expect(contract.openVoting("topic 1")).to.be.revertedWith("The topic does not exists");
      
  });

  it("Should NOT pay quota (residence)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await expect(contract.payQuota(1, {value: ethers.parseEther("0.01")}))
        .to.be.revertedWith("The residence does not exists");  
  });

  it("Should NOT pay quota (value)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await expect(contract.payQuota(1102, {value: ethers.parseEther("0.001")}))
        .to.be.revertedWith("Wrong value");  
  });

  it("Should NOT pay quota (doublepay)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.payQuota(1102, {value: ethers.parseEther("0.01")});
      await expect(contract.payQuota(1102, {value: ethers.parseEther("0.01")}))
        .to.be.revertedWith("You cannot pay twice a month");  
  });

    it("Should NOT transfer (manager)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      const instance = contract.connect(accounts[1]);
      await expect(instance.transfer("topic 1", 100))
        .to.be.revertedWith("Only the manager can do this");
    });  

    it("Should NOT transfer (funds)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await expect(contract.transfer("topic 1", 100))
        .to.be.revertedWith("Insufficient funds");
    }); 

    it("Should NOT transfer (topic)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await addResidents(contract, 1, accounts);  
      await expect(contract.transfer("topic 1", 100))
        .to.be.revertedWith("Only APPROVED SPENT topics can be used for transfers");
    }); 

     it("Should NOT transfer (amount)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      
      await addResidents(contract, 10, accounts);

      await contract.addTopic("topic 1", "description 1", Category.SPENT, 100, accounts[1].address);
      await contract.openVoting("topic 1");
      
      await addVotes(contract, 10, accounts);   
      
      await contract.closeVoting("topic 1");

      await expect(contract.transfer("topic 1", 101))
        .to.be.revertedWith("The amount muste be less or equal the APPROVED topic");

    });  
   

});
