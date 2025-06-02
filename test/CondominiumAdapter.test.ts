import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

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
        DENIED = 3
    }//0,1,2,3

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

    it("Should add resident", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addResident(accounts[1].address, 1301);
      expect(await contract.isResident(accounts[1].address)).to.equal(true);
    });

    it("Should remove resident", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addResident(accounts[1].address, 1301);
      await adapter.removeResident(accounts[1].address);
      
      
      expect(await contract.isResident(accounts[1].address)).to.equal(false);
    });

    it("Should set Conselour", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addResident(accounts[1].address, 1301);
      await adapter.setCounselor(accounts[1].address, true);
         
      expect(await contract.counselors(accounts[1].address)).to.equal(true);

    });

    it("Should add Topic", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addTopic("topic 1", "description 1");
         
      expect(await contract.topicExists("topic 1")).to.equal(true);

    });    

    it("Should remove Topic", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addTopic("topic 1", "description 1");
      await adapter.removeTopic("topic 1");   
      expect(await contract.topicExists("topic 1")).to.equal(false);

    });    

    it("Should open voting", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);

      await adapter.addTopic("topic 1", "description 1");
      await adapter.openVoting("topic 1");
      const topic = await contract.getTopic("topic 1");   
      expect(topic.status).to.equal(Status.VOTING);

    });    

    it("Should vote", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addResident(accounts[1].address, 1301);

      await adapter.addTopic("topic 1", "description 1");
      await adapter.openVoting("topic 1");
      
      const instance = await adapter.connect(accounts[1]);
      await instance.vote("topic 1", Options.YES);   
      
      expect(await contract.numberOfVotes("topic 1")).to.equal(1);

    });  


    it("Should closing vote", async function () {
      const { adapter, manager, accounts } = await loadFixture(deployAdapterFixture);
      const { contract } = await loadFixture(deployImplementationFixture);
      
      await adapter.upgrade(contract.target);
      await adapter.addResident(accounts[1].address, 1301);

      await adapter.addTopic("topic 1", "description 1");
      await adapter.openVoting("topic 1");
      
      const instance = await adapter.connect(accounts[1]);
      await instance.vote("topic 1", Options.YES);   
      
      await adapter.closeVoting("topic 1");

      const topic = await contract.getTopic("topic 1");   
      expect(topic.status).to.equal(Status.APPROVED);

    });  

});
