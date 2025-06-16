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
      url: process.env.LOCAL,
      chainId: parseInt(`${process.env.CHAIN_ID_LOCAL}`),
      accounts: {
        mnemonic: process.env.MNEMONIC
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
