import { Contract, ContractFactory } from "@ethersproject/contracts";
import {artifacts, ethers, waffle, run} from "hardhat";
import { DefaultRenderExtension, DefaultRenderExtension__factory, Extension, Extension__factory, ScriptChecker__factory } from "../src/contracts";

const main = async () => {

    const [deployer] = await ethers.getSigners();

  
    await run("verify:verify", {
      address: "0x449b4980E59E93075484E1C7729987d846FBADD7",
      constructorArguments: [],
      contract: "contracts/ScriptChecker.sol:ScriptChecker",
    });
  
    await run("verify:verify", {
      address: "0xfb38A6c806CB3717B4B5789d4B67396876F8787b",
      constructorArguments: [],
      contract: "contracts/Extension.sol:Extension",
    });

    await run("verify:verify", {
      address: "0xBccb126E9E49e321e37AcA065839fE0C659c2880",
      constructorArguments: [],
      contract: "contracts/extensions/DefaultRenderExtension.sol:DefaultRenderExtension",
    });
  

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });