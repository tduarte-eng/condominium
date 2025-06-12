
import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Endereço do deployer:", deployer.address);
}

main().catch((error) => {
    console.error("Erro ao obter o deployer:", error);
    process.exitCode = 1;
});
