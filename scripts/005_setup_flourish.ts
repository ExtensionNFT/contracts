import { Contract, ContractFactory } from "@ethersproject/contracts";
import {artifacts, ethers, waffle, upgrades} from "hardhat";
import { DefaultRenderExtension, DefaultRenderExtension__factory, Extension, Extension__factory, Flourish__factory, ScriptChecker__factory } from "../src/contracts";

const main = async () => {

  //Mumbai
  // const EXTENSION_ADDRESS = "0xc2f5672B87B6A17F55D1FcE9bFb6434369B9afBd";
  // const DEFAULT_RENDER = "0xF36c5697004842b120A1aC349671482caA2331C1";
  // const NEW_RENDER = "0x4eF5fbB651dD936D091724dFA394a261d1D6529D";

  //Main
  const EXTENSION_ADDRESS = "0x66aC6646cd082C8B50356a8bB917E58650008483";
  const DEFAULT_RENDER = "0x4525c10536332ac27Fd38da40ABd639Babe1E952";

    const [deployer] = await ethers.getSigners();

    console.log(`Deployer ${deployer.address}`);

    const extensionArtifact = artifacts.require("Extension");
    const extensionsContract = await ethers.getContractAt(extensionArtifact.abi, EXTENSION_ADDRESS) as Extension;
    console.log(`Extensions NFT: ${extensionsContract.address}`);

    const defaultRenderFactory = new Flourish__factory(deployer);
    const renderContract = await defaultRenderFactory.deploy();
    await renderContract.deployed();

    console.log(`Default Render: ${renderContract.address}`);

    //const addExt = await extensionsContract.replaceExtension(0, DEFAULT_RENDER, NEW_RENDER);
    const addExt = await extensionsContract.replaceExtension(0, DEFAULT_RENDER, ((renderContract as unknown as Contract).address));
    await addExt.wait();

    const result = await extensionsContract.ownerMint(1, deployer.address);
    await result.wait();

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });