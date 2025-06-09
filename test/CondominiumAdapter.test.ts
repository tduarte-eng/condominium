import {
  time,
  loadFixture,
  impersonateAccount,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers"
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { CondominiumAdapter } from "../typechain-types";

describe("CondominiumAdapter", function () {

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

    async function addResidents(adapter: CondominiumAdapter, count: number, accounts: SignerWithAddress[]){
      for(let i=1; i <= count; i++){
        const residenceId = (1000 * Math.ceil(i / 25)) + (100 * Math.ceil(i/5)) + (i - (5 * Math.floor((i - 1) /5)));
        await adapter.addResident(accounts[i-1].address, residenceId);
        
        const instance = adapter.connect(accounts[i-1]);
        await instance.payQuota(residenceId, {value: ethers.parseEther("0.01")});
      } 
    }

    async function addVotesYes(adapter: CondominiumAdapter, count: number, accounts: SignerWithAddress[]){
      for(let i=1; i <= count; i++){
        const instance = adapter.connect(accounts[i-1]);
        await instance.vote("topic 1", Options.YES); 
      } 
    }

    async function deployAdapterFixture() {
    
        const accounts = await hre.ethers.getSigners();
        const manager = accounts[0];

        const CondominiumAdapter = await hre.ethers.getContractFactory("CondominiumAdapter");
        const adapter = await CondominiumAdapter.deploy();

        return { adapter, manager, accounts };
    }

    async function deployImplementationFixture() {
    
        const Condominium = await hre.ethers.getContractFactory("Condominium");
        const contract = await Condominium.deploy();

        return { contract };
    }


    it("Should upgrade", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      const address = await adapter.getImplAddress(); 
      expect(address).to.equal(contract.target);
    });

    it("Should NOT upgrade (permission)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      const instance = adapter.connect(accounts[1]);

      await expect(instance.upgrade(contract.target)).to.be.revertedWith("You do not have permission")
    });

    it("Should NOT upgrade (address)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      
      await expect(adapter.upgrade(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
    });

    it("Should add resident", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addResident(accounts[1].address, 1301);
      expect(await contract.isResident(accounts[1].address)).to.equal(true);
    });

    it("Should add resident (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      
      await expect(adapter.addResident(accounts[1].address, 1301))
        .to.be.revertedWith("You must upgrade first");
    });

    it("Should remove resident", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addResident(accounts[1].address, 1301);
      await adapter.removeResident(accounts[1].address);
      
      
      expect(await contract.isResident(accounts[1].address)).to.equal(false);
    });

    it("Should NOT remove resident (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

      expect(adapter.removeResident(accounts[1].address))
        .to.be.revertedWith("You must upgrade first");
      });



    it("Should set Conselour", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addResident(accounts[1].address, 1301);
      await adapter.setCounselor(accounts[1].address, true);
         
      expect(await contract.counselors(accounts[1].address)).to.equal(true);

    });

    it("Should NOT set Conselour (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

    await expect(adapter.setCounselor(accounts[1].address, true))
        .to.be.revertedWith("You must upgrade first");
    });


    it("Should add Topic", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
         
      expect(await contract.topicExists("topic 1")).to.equal(true);

    });    

    it("Should NOT add Topic (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
         
      await expect(adapter.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address))
        .to.be.revertedWith("You must upgrade first");

    });    

    it("Should edit Topic", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addTopic("topic 1", "description 1", Category.SPENT, 1, manager.address);
      await adapter.editTopic("topic 1", "new description", 2, manager.address);

      const topic = await contract.getTopic("topic 1");

      expect(topic.description == "new description").to.equal(true);

    });    

    it("Should NOT edit Topic (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

      await expect(adapter.editTopic("topic 1", "new description", 2, manager.address))
              .to.be.revertedWith("You must upgrade first");

    });

    it("Should remove Topic", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await adapter.removeTopic("topic 1");   
      expect(await contract.topicExists("topic 1")).to.equal(false);

    });    

    it("Should remove Topic (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      
      expect(adapter.removeTopic("topic 1"))
        .to.be.revertedWith("You must upgrade first");
    });    

    it("Should open voting", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);

      await adapter.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await adapter.openVoting("topic 1");
      const topic = await contract.getTopic("topic 1");   
      expect(topic.status).to.equal(Status.VOTING);

    });    

    it("Should NOT open voting (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      
      await expect(adapter.openVoting("topic 1"))
        .to.be.revertedWith("You must upgrade first");

    });    

    it("Should vote", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await addResidents(adapter, 2, accounts);

      await adapter.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await adapter.openVoting("topic 1");
      
      const instance = await adapter.connect(accounts[1]);
      await instance.vote("topic 1", Options.YES);   
      
      expect(await contract.numberOfVotes("topic 1")).to.equal(1);

    });  

    it("Should NOT vote (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      
      await expect(adapter.vote("topic 1", Options.YES))
        .to.be.revertedWith("You must upgrade first");
    });  


    
    it("Should closing vote", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await addResidents(adapter, 5, accounts);

      await adapter.addTopic("topic 1", "description 1", Category.DECISION, 0, manager.address);
      await adapter.openVoting("topic 1");
      
      await addVotesYes(adapter, 5, accounts);   
      
      await adapter.closeVoting("topic 1");

      const topic = await contract.getTopic("topic 1");   
      expect(topic.status).to.equal(Status.APPROVED);

    });  

    it("Should NOT closing vote (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

      await expect(adapter.closeVoting("topic 1"))
        .to.be.revertedWith("You must upgrade first");
    });  

    it("Should NOT closing vote (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

      await expect(adapter.closeVoting("topic 1"))
        .to.be.revertedWith("You must upgrade first");
    });  

    it("Should NOT pay quota (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);

      await expect(adapter.payQuota(1102, {value: ethers.parseEther("0.01")}))
        .to.be.revertedWith("You must upgrade first");
    });  

    it("Should transfer", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await addResidents(adapter, 10, accounts);

      await adapter.addTopic("topic 1", "description 1", Category.SPENT, 100, accounts[1].address);
      await adapter.openVoting("topic 1");
      
      await addVotesYes(adapter, 10, accounts);   
      
      await adapter.closeVoting("topic 1");

      const balanceBefore = await ethers.provider.getBalance(contract.target);
      const balanceWorkerBefore = await ethers.provider.getBalance(accounts[1].address);

      await adapter.transfer("topic 1", 100);
      const balanceAfter = await ethers.provider.getBalance(contract.target);
      const balanceWorkerAfter = await ethers.provider.getBalance(accounts[1].address);
      const topic = await contract.getTopic("topic 1")
         
      expect(balanceAfter).to.equal(balanceBefore-100n);
      expect(balanceWorkerAfter).to.equal(balanceWorkerBefore+100n);
      expect(topic.status).to.equal(Status.SPENT);

    });  

    it("Should NOT transfer (upgrade)", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      await expect(adapter.transfer("topic 1", 100)).to.be.revertedWith("You must upgrade first");

    });

});
