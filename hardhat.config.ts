import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-coverage"
import "hardhat-contract-sizer"
//import dotenv from 'dotenv';
//dotenv.config;
require('dotenv').config();


if (!process.env.NODE_URL || !process.env.CHAIN_ID || !process.env.SECRET) {
  throw new Error("Variáveis de ambiente NODE_URL, CHAIN_ID ou SECRET não estão definidas.");
}



const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000
      }
    }
  },
    networks: {
    local: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk"
      }
    },
    REDE_BNB: {
      url: `${process.env.NODE_URL}`,
      chainId: parseInt(`${process.env.CHAIN_ID}`),
      accounts:[process.env.SECRET],
    }
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  }
};

export default config;
