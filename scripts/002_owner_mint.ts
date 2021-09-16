import { Contract, ContractFactory } from "@ethersproject/contracts";
import { Console } from "console";
import {artifacts, ethers, waffle, upgrades} from "hardhat";
import { DefaultRenderExtension, DefaultRenderExtension__factory, Extension, Extension__factory, ScriptChecker__factory } from "../src/contracts";

const main = async () => {

    const [deployer, owner] = await ethers.getSigners();

    const extensionsContract = Extension__factory.connect(process.env.EXTENSIONNFT_ADDRESS!, deployer);
    const result = await extensionsContract.ownerMint(1, deployer.address, {nonce:5});
    await result.wait();

    const ownedby = await extensionsContract.ownerOf(1);
    console.log(ownedby);

    const uri = await extensionsContract.tokenURI(1);
    console.log(uri);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });