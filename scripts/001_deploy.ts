import { Contract, ContractFactory } from "@ethersproject/contracts";
import {artifacts, ethers, waffle, upgrades} from "hardhat";
import { DefaultRenderExtension, DefaultRenderExtension__factory, Extension, Extension__factory, ScriptChecker__factory } from "../src/contracts";

const main = async () => {

    const [deployer] = await ethers.getSigners();

    const checkerFactory = new ScriptChecker__factory(deployer);
    const checkerContract = await checkerFactory.deploy();
    await checkerContract.deployed();

    console.log(`Checker: ${checkerContract.address}`);

    const factory = new Extension__factory(deployer);
    const extensionsContract = await upgrades
        .deployProxy(factory as unknown as ContractFactory, [1000, 20, (checkerContract as any).address]) as unknown as Extension;
    await extensionsContract.deployed();

    console.log(`Extensions NFT: ${extensionsContract.address}`);

    const defaultRenderFactory = new DefaultRenderExtension__factory(deployer);
    const renderContract = await defaultRenderFactory.deploy();
    await renderContract.deployed();

    console.log(`Default Render: ${renderContract.address}`);

    const addExt = await extensionsContract.addExtension((renderContract as unknown as Contract).address);
    await addExt.wait();

    const transferTo = await extensionsContract.connect(deployer).transferOwnership(process.env.OWNER_PUBLIC!);
    await transferTo.wait();

    const contractUri = await extensionsContract.contractURI();
    console.log(contractUri);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });