
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-truffle5";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";

import "solidity-coverage";
import "hardhat-gas-reporter";

import type { HardhatUserConfig } from "hardhat/config";

import * as dotenv from "dotenv";
dotenv.config();

const keys = [];
if (process.env.DEPLOYER_PRIVATE_KEY !== undefined) {
  keys.push(process.env.DEPLOYER_PRIVATE_KEY);
}
if (process.env.OWNER_PRIVATE_KEY !== undefined) {
  keys.push(process.env.OWNER_PRIVATE_KEY);
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0, // workaround from https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136 . Remove when that issue is closed.
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts: keys,
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || "",
      accounts: keys,
    },
    mumbai: {
      url: process.env.MUMBAI_URL || "",
      accounts: keys,
    },
    mainnet: {
      url: process.env.MAINNET_URL || "",
      gasPrice: 67e9,
      accounts: {
        mnemonic: process.env.MAINNET_DEPLOYER || "",
      },
      timeout: 1000000,
    },
  },
  typechain: {
    outDir: "src/contracts",
    target: "ethers-v5",
    glob: "./artifacts/contracts/**/*.json"
  },
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 20,
          },
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
