import { Contract, ContractFactory } from "@ethersproject/contracts";
import {artifacts, ethers, waffle, upgrades} from "hardhat";
import { DefaultRenderExtension, DefaultRenderExtension__factory, Extension, Extension__factory, ScriptChecker__factory } from "../src/contracts";

const main = async () => {

    const [deployer] = await ethers.getSigners();

    const checkerFactory = new ScriptChecker__factory(deployer);
    const checkerContract = await checkerFactory.deploy();
    await checkerContract.deployed();

    const factory = new Extension__factory(deployer);
    const extensionsContract = await upgrades
        .deployProxy(factory as unknown as ContractFactory, [20000, 19999, (checkerContract as any).address]) as unknown as Extension;
    await extensionsContract.deployed();

    const defaultRenderFactory = new DefaultRenderExtension__factory(deployer);
    const renderContract = await defaultRenderFactory.deploy();
    await renderContract.deployed();

    const addExt = await extensionsContract.addExtension((renderContract as unknown as Contract).address);
    await addExt.wait();

    let totals = {
      "b1": 0,
      "b2": 0,
      "b3": 0,
      "b4": 0,
      "b5": 0,
      "b6": 0,
      "b7": 0,
      "b8": 0,
      "b9": 0
    } as Record<string, number>;

    let maxBoxes = {

    } as Record<string, number>;
    
    for(let i = 0; i < 19999; i++) {

      const pubMint = await extensionsContract.connect(deployer).ownerMint(1, deployer.address);
      await pubMint.wait();
      let uri = await extensionsContract.tokenURI(i+1);
      
      console.log("");
      console.log(uri);    


      let d = uri.split(',')[1];
      let obj = JSON.parse(Buffer.from(d, 'base64').toString());

      for(let i = 1; i <= 9; i++) {
        if (obj.attrs.filter((x:any) => x.trait_type == `OG Box ${i}`).length > 0) {
          totals[`b${i}`]++;
        }
      }


      for(let i = 1; i <= 9; i++) {
        if (obj.attrs.filter((x:any) => x.trait_type == `OG Box ${i}`).length > 0) {
          totals[`b${i}`]++;
        }
        console.log(`Box ${i} - ${totals["b" + i.toString()]}`);
      }

      const t = obj.attrs.filter((x:any) => x.trait_type == 'OG Boxes')[0].value;
      if (!maxBoxes[`b${t}`])
        maxBoxes[`b${t}`] = 0;
      maxBoxes[`b${t}`]++;
      for(let n in maxBoxes) {
        console.log(`${n} - ${maxBoxes[n]}`);
      }
    }

}





main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });