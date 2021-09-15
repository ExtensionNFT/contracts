import {expect} from "chai";
import * as timeMachine from "ganache-time-traveler";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {artifacts, ethers, upgrades, waffle} from "hardhat";
import {Extension__factory, Extension} from "../../src/contracts";
import {deployMockContract, MockContract} from "ethereum-waffle";
import { BigNumber } from "@ethersproject/bignumber";
import { ContractFactory } from "@ethereum-waffle/provider/node_modules/ethers";
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

let deployer: SignerWithAddress;
let user1: SignerWithAddress;
let renderExtension1: MockContract;
let svgValidator: MockContract;
let extensionContract: Extension;


const IRenderExtension = artifacts.require("IRenderExtension");
const ISvgValidator = artifacts.require("ISvgValidator");

const MINT_PRICE = ethers.utils.parseUnits(".1", 18);

const INITIAL_TOTAL_MINTS = 10;
const INITIAL_OWNER_MINTS = 3;

const extensions: MockContract[] = [];

describe("Extension Contract", () => {

    let snapshotId: string;

  beforeEach(async () => {
    const snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  before(async () => {
    [deployer, user1] = await ethers.getSigners();

    renderExtension1 = await deployMockContract(deployer, IRenderExtension.abi);
    await renderExtension1.mock.supportsInterface.returns(true);

    svgValidator = await deployMockContract(deployer, ISvgValidator.abi);

    for(let i = 0; i < 8; i++) {
        extensions[i] = await deployMockContract(deployer, IRenderExtension.abi);
        await extensions[i].mock.supportsInterface.returns(true);
    }

    const factory = new Extension__factory(deployer);
    extensionContract = await upgrades
        .deployProxy(factory as unknown as ContractFactory, [INITIAL_TOTAL_MINTS, INITIAL_OWNER_MINTS, svgValidator.address]) as unknown as Extension;
    await extensionContract.deployed();

    await extensionContract.connect(deployer).addExtension(renderExtension1.address);
  });

  describe("Initializer Validation", () => {
    it("Sets Defaults", async () => {
        const currentGeneration = await extensionContract.currentGeneration();
        const canModerate = await extensionContract.canModerate();
        const moderator = await extensionContract.moderator();
        const validatorAddress = await extensionContract.validatorAddress();
        const generation = await extensionContract.generations(1);

        expect(currentGeneration.toString()).to.be.equal("1");
        expect(canModerate).to.be.equal(true);
        expect(moderator).to.be.equal(deployer.address);
        expect(validatorAddress).to.be.equal(svgValidator.address);
        expect(generation.mintNumStart.toString()).to.be.equal("1");
    });
  });

  describe("Extension Adds", () => {
    it("Only allows contracts", async () => {
        await expect(
            extensionContract.connect(deployer).addExtension(deployer.address)
        ).to.be.reverted;
    });
    it("Only allows render extensions", async () => {
        await expect(
            extensionContract.connect(deployer).addExtension(extensionContract.address)
        ).to.be.revertedWith("NO_RENDER_SUPPORT")
    });
    it("Prevents zero address", async () => {
        await expect(
            extensionContract.connect(deployer).addExtension(ZERO_ADDRESS)
        ).to.be.revertedWith("INVALID_ADDRESS")
    });
    it("Won't allow banned contracts when under moderation", async () => {
        await extensionContract.connect(deployer).moderateAddress(extensions[0].address, true);
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address)
        ).to.be.revertedWith("CONTRACT_BANNED");
        await extensionContract.connect(deployer).moderateAddress(extensions[0].address, false);
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address)
        ).to.not.be.revertedWith("CONTRACT_BANNED");
        await extensionContract.connect(deployer).moderateAddress(extensions[0].address, true);
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address)
        ).to.be.revertedWith("CONTRACT_BANNED");
        await extensionContract.connect(deployer).relinquishModeration();
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address)
        ).to.not.be.revertedWith("CONTRACT_BANNED");
    });
    it("Won't allow banned senders when under moderation", async () => {
        await extensionContract.connect(deployer).moderateAddress(deployer.address, true);
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address)
        ).to.be.revertedWith("SENDER_BANNED");
        await extensionContract.connect(deployer).moderateAddress(deployer.address, false);
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address)
        ).to.not.be.revertedWith("SENDER_BANNED");
        await extensionContract.connect(deployer).moderateAddress(deployer.address, true);
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address)
        ).to.be.revertedWith("SENDER_BANNED");
        await extensionContract.connect(deployer).relinquishModeration();
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address)
        ).to.not.be.revertedWith("SENDER_BANNED");
    });
    it("Enforces registration cost for public registrations", async () => {
        const registrationCost = await extensionContract.REGISTRATION_COST();
        await expect(
            extensionContract.connect(user1).addExtension(extensions[0].address)
        ).to.be.revertedWith("NO_REGISTRATION_FEE");
        await expect(
            extensionContract.connect(user1).addExtension(extensions[0].address, {value: registrationCost})
        ).to.not.be.revertedWith("NO_REGISTRATION_FEE");
    });
    it("Allows owner to register for free when under moderation", async () => {
        const registrationCost = await extensionContract.REGISTRATION_COST();
        await expect(
            extensionContract.connect(user1).addExtension(extensions[0].address)
        ).to.be.revertedWith("NO_REGISTRATION_FEE");
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address)
        ).to.not.be.revertedWith("NO_REGISTRATION_FEE");
        await extensionContract.connect(deployer).relinquishModeration();
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address)
        ).to.be.revertedWith("NO_REGISTRATION_FEE");
        await expect(
            extensionContract.connect(deployer).addExtension(extensions[0].address, {value: registrationCost})
        ).to.not.be.revertedWith("NO_REGISTRATION_FEE");
    });
    it("Increments current extension set", async () => {
        const extSet = await extensionContract.currentExtensionSet();       
        await extensionContract.connect(deployer).addExtension(extensions[0].address)
        const newExtSet = await extensionContract.currentExtensionSet();       
        expect(extSet.add(1)).to.be.equal(newExtSet);
       
    });
    it("Only ever allowed 8 extensions", async () => {        
        for(let i = 0; i < extensions.length; i++) {
            await extensionContract.connect(deployer).addExtension(extensions[i].address);
        }
        await extensionContract.connect(deployer).addExtension(extensions[0].address);

        const currentExtesionSet = await extensionContract.currentExtensionSet();
        const extSet = await extensionContract.getExtensionsSetAddresses(currentExtesionSet);

        expect(extSet.length).to.be.equal(8);
    });
    it("Extension adds append and push off the oldest", async () => {        
        for(let i = 0; i < extensions.length; i++) {
            await extensionContract.connect(deployer).addExtension(extensions[i].address);
        }

        let currentExtesionSet = await extensionContract.currentExtensionSet();
        let extSet = await extensionContract.getExtensionsSetAddresses(currentExtesionSet);
        
        for(let i = 0; i < extensions.length; i++)
            expect(extSet[i]).to.be.equal(extensions[i].address);

        await extensionContract.connect(deployer).addExtension(extensions[0].address);
        
        currentExtesionSet = await extensionContract.currentExtensionSet();
        extSet = await extensionContract.getExtensionsSetAddresses(currentExtesionSet);

        expect(extSet[0]).to.be.equal(extensions[1].address);
        expect(extSet[1]).to.be.equal(extensions[2].address);
        expect(extSet[2]).to.be.equal(extensions[3].address);
        expect(extSet[3]).to.be.equal(extensions[4].address);
        expect(extSet[4]).to.be.equal(extensions[5].address);
        expect(extSet[5]).to.be.equal(extensions[6].address);
        expect(extSet[6]).to.be.equal(extensions[7].address);
        expect(extSet[7]).to.be.equal(extensions[0].address);
    });
  });

  describe("Extension Replaces", () => {
    it("Only allows contracts", async () => {
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, deployer.address)
        ).to.be.reverted;
    });
    it("Only allows render extensions", async () => {
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensionContract.address)
        ).to.be.revertedWith("NO_RENDER_SUPPORT")
    });
    it("Prevents zero address", async () => {
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, ZERO_ADDRESS)
        ).to.be.revertedWith("INVALID_ADDRESS")
    });
    it("Won't allow banned contracts when under moderation", async () => {
        await extensionContract.connect(deployer).moderateAddress(extensions[0].address, true);
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.be.revertedWith("CONTRACT_BANNED");
        await extensionContract.connect(deployer).moderateAddress(extensions[0].address, false);
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.not.be.revertedWith("CONTRACT_BANNED");
        await extensionContract.connect(deployer).moderateAddress(extensions[0].address, true);
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.be.revertedWith("CONTRACT_BANNED");
        await extensionContract.connect(deployer).relinquishModeration();
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.not.be.revertedWith("CONTRACT_BANNED");
    });
    it("Won't allow banned senders when under moderation", async () => {
        await extensionContract.connect(deployer).moderateAddress(deployer.address, true);
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.be.revertedWith("SENDER_BANNED");
        await extensionContract.connect(deployer).moderateAddress(deployer.address, false);
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.not.be.revertedWith("SENDER_BANNED");
        await extensionContract.connect(deployer).moderateAddress(deployer.address, true);
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.be.revertedWith("SENDER_BANNED");
        await extensionContract.connect(deployer).relinquishModeration();
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.not.be.revertedWith("SENDER_BANNED");
    });

    it("Enforces registration cost for public registrations", async () => {
        const registrationCost = await extensionContract.REGISTRATION_COST();
        await expect(
            extensionContract.connect(user1).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.be.revertedWith("NO_REGISTRATION_FEE");
        await expect(
            extensionContract.connect(user1).replaceExtension(0, renderExtension1.address, extensions[0].address, {value: registrationCost})
        ).to.not.be.revertedWith("NO_REGISTRATION_FEE");
    });
    it("Allows owner to register for free when under moderation", async () => {
        const registrationCost = await extensionContract.REGISTRATION_COST();
        await expect(
            extensionContract.connect(user1).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.be.revertedWith("NO_REGISTRATION_FEE");
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensions[0].address)
        ).to.not.be.revertedWith("NO_REGISTRATION_FEE");
        await extensionContract.connect(deployer).relinquishModeration();
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, extensions[0].address, extensions[1].address)
        ).to.be.revertedWith("NO_REGISTRATION_FEE");
        await expect(
            extensionContract.connect(deployer).replaceExtension(0, extensions[0].address, extensions[1].address, {value: registrationCost})
        ).to.not.be.revertedWith("NO_REGISTRATION_FEE");
    });
    it("Increments current extension set", async () => {
        const extSet = await extensionContract.currentExtensionSet();       
        await extensionContract.connect(deployer).replaceExtension(0, renderExtension1.address, extensions[0].address)
        const newExtSet = await extensionContract.currentExtensionSet();       
        expect(extSet.add(1)).to.be.equal(newExtSet);       
    });

    it("Replaces address in new set", async () => {
        for(let i = 0; i < extensions.length; i++) {
            await extensionContract.connect(deployer).addExtension(extensions[i].address);
        }

        await extensionContract.connect(deployer).replaceExtension(3, extensions[3].address, renderExtension1.address);

        const extSetId = await extensionContract.currentExtensionSet();       
        const extSet = await extensionContract.getExtensionsSetAddresses(extSetId);         

        expect(extSet[0]).to.be.equal(extensions[0].address);
        expect(extSet[1]).to.be.equal(extensions[1].address);
        expect(extSet[2]).to.be.equal(extensions[2].address);
        expect(extSet[3]).to.be.equal(renderExtension1.address);
        expect(extSet[4]).to.be.equal(extensions[4].address);
        expect(extSet[5]).to.be.equal(extensions[5].address);
        expect(extSet[6]).to.be.equal(extensions[6].address);
        expect(extSet[7]).to.be.equal(extensions[7].address);
        expect(extSet.length).to.be.equal(8);
    });
  });


  describe("Extension Removals", () => {

    beforeEach(async () => {
        for(let i = 0; i < 3; i++) {
            await extensionContract.connect(deployer).addExtension(extensions[i].address);
        }
    });

    it("Won't allow banned senders when under moderation", async () => {        
        await extensionContract.connect(deployer).moderateAddress(deployer.address, true);
        await expect(
            extensionContract.connect(deployer).removeExtension(0, renderExtension1.address)
        ).to.be.revertedWith("SENDER_BANNED");
        await extensionContract.connect(deployer).moderateAddress(deployer.address, false);
        await expect(
            extensionContract.connect(deployer).removeExtension(0, renderExtension1.address)
        ).to.not.be.revertedWith("SENDER_BANNED");
        await extensionContract.connect(deployer).moderateAddress(deployer.address, true);
        await expect(
            extensionContract.connect(deployer).removeExtension(0, extensions[0].address)
        ).to.be.revertedWith("SENDER_BANNED");
        await extensionContract.connect(deployer).relinquishModeration();
        await expect(
            extensionContract.connect(deployer).removeExtension(0, extensions[0].address)
        ).to.not.be.revertedWith("SENDER_BANNED");
    });

    it("Enforces registration cost for public calls", async () => {
        const registrationCost = await extensionContract.REGISTRATION_COST();
        await expect(
            extensionContract.connect(user1).removeExtension(0, renderExtension1.address)
        ).to.be.revertedWith("NO_REGISTRATION_FEE");
        await expect(
            extensionContract.connect(user1).removeExtension(0, renderExtension1.address, {value: registrationCost})
        ).to.not.be.revertedWith("NO_REGISTRATION_FEE");
    });
    it("Allows owner to call for free when under moderation", async () => {
        const registrationCost = await extensionContract.REGISTRATION_COST();
        await expect(
            extensionContract.connect(user1).removeExtension(0, renderExtension1.address)
        ).to.be.revertedWith("NO_REGISTRATION_FEE");
        await expect(
            extensionContract.connect(deployer).removeExtension(0, renderExtension1.address)
        ).to.not.be.revertedWith("NO_REGISTRATION_FEE");
        await extensionContract.connect(deployer).relinquishModeration();
        await expect(
            extensionContract.connect(deployer).removeExtension(0, extensions[0].address)
        ).to.be.revertedWith("NO_REGISTRATION_FEE");
        await expect(
            extensionContract.connect(deployer).removeExtension(0, extensions[0].address, {value: registrationCost})
        ).to.not.be.revertedWith("NO_REGISTRATION_FEE");
    });
    it("Increments current extension set", async () => {
        const extSet = await extensionContract.currentExtensionSet();       
        await extensionContract.connect(deployer).removeExtension(0, renderExtension1.address);
        const newExtSet = await extensionContract.currentExtensionSet();       
        expect(extSet.add(1)).to.be.equal(newExtSet);       
    });

    it("Ensures we always have one render extension", async () => {
        const extSet = await extensionContract.currentExtensionSet();      
        const currentSet = await extensionContract.getExtensionsSetAddresses(extSet);
        for(let i = 0; i < currentSet.length - 1; i++)         
            await extensionContract.connect(deployer).removeExtension(0, currentSet[i]);

        await expect(
            extensionContract.connect(deployer).removeExtension(0, currentSet[currentSet.length - 1])
        ).to.be.revertedWith("MUST_HAVE_ONE");      
    });


    it("Removals from the middle collapse the array and keep order", async () => {
   
        await extensionContract.connect(deployer).removeExtension(1, extensions[0].address);

        const extSet = await extensionContract.currentExtensionSet();      
        const currentSet = await extensionContract.getExtensionsSetAddresses(extSet);

        expect(currentSet[0]).to.be.equal(renderExtension1.address);
        expect(currentSet[1]).to.be.equal(extensions[1].address);
        expect(currentSet[2]).to.be.equal(extensions[2].address);
    });

  });

  describe("Mint Limits", () => {
    it("Enforces mint limits in genesis", async () => {

        //Exhaust owner mints
        for(let i = 0; i < INITIAL_OWNER_MINTS; i++) 
            await extensionContract.connect(deployer).ownerMint(1, deployer.address);
        await expect(extensionContract.connect(deployer).ownerMint(1, deployer.address))
            .to.be.revertedWith("OWNER_MINT_COMPLETE");

        //Exhause public mints
        for(let i = 0; i < INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS; i++) 
            await extensionContract.connect(deployer).mint(1, {value: MINT_PRICE.toString()});
        await expect(extensionContract.connect(deployer).mint(1, {value: MINT_PRICE.toString()}))
            .to.be.revertedWith("GENERATION_LOCKED");
    });

    it("Enforces mint limits in subsequent generations", async () => {

        //Exhaust owner mints
        for(let i = 0; i < INITIAL_OWNER_MINTS; i++) 
            await extensionContract.connect(deployer).ownerMint(1, deployer.address);

        //Exhause public mints
        for(let i = 0; i < INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS; i++) 
            await extensionContract.connect(deployer).mint(1, {value: MINT_PRICE.toString()});

        const mintAmount = 13;
        const ownerMints = 5;
        await extensionContract.connect(deployer).nextGeneration(mintAmount, ownerMints);
        
        //Exhaust owner mints
        for(let i = 0; i < ownerMints; i++) 
            await extensionContract.connect(deployer).ownerMint(1, deployer.address);
        await expect(extensionContract.connect(deployer).ownerMint(1, deployer.address))
            .to.be.revertedWith("OWNER_MINT_COMPLETE");

        //Exhause public mints
        for(let i = 0; i < mintAmount - ownerMints; i++) 
            await extensionContract.connect(deployer).mint(1, {value: MINT_PRICE.toString()});
        await expect(extensionContract.connect(deployer).mint(1, {value: MINT_PRICE.toString()}))
            .to.be.revertedWith("GENERATION_LOCKED");
    });

    it("Enforces mint limits in bulk when in genesis", async () => {

        //Exhaust owner mints
        await extensionContract.connect(deployer).ownerMint(INITIAL_OWNER_MINTS, deployer.address);
        await expect(extensionContract.connect(deployer).ownerMint(1, deployer.address))
            .to.be.revertedWith("OWNER_MINT_COMPLETE");

        //Exhause public mints
        await extensionContract.connect(deployer).mint(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS, {value: MINT_PRICE.mul(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS).toString()});
       await expect(extensionContract.connect(deployer).mint(1, {value: MINT_PRICE.toString()}))
           .to.be.revertedWith("GENERATION_LOCKED");
    });

    it("Enforces mint limits in bulk when in subsequent generations", async () => {

        //Exhaust owner mints
        await extensionContract.connect(deployer).ownerMint(INITIAL_OWNER_MINTS, deployer.address);
        
        //Exhause public mints
        await extensionContract.connect(deployer).mint(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS, {value: MINT_PRICE.mul(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS).toString()});
               
        const mintAmount = 13;
        const ownerMints = 5;
        await extensionContract.connect(deployer).nextGeneration(mintAmount, ownerMints);
        
        //Exhaust owner mints        
        await extensionContract.connect(deployer).ownerMint(ownerMints, deployer.address);
        await expect(extensionContract.connect(deployer).ownerMint(ownerMints, deployer.address))
            .to.be.revertedWith("OWNER_MINT_COMPLETE");

        //Exhause public mints
        await extensionContract.connect(deployer).mint(mintAmount - ownerMints, {value: MINT_PRICE.mul(mintAmount - ownerMints).toString()});
        await expect(extensionContract.connect(deployer).mint(mintAmount - ownerMints, {value: MINT_PRICE.mul(mintAmount - ownerMints).toString()}))
            .to.be.revertedWith("GENERATION_LOCKED");
    });

    it("Enforces mint limits with a bulk mint pushing over the edge", async () => {

        //Exhaust owner mints
        await extensionContract.connect(deployer).ownerMint(1, deployer.address);
        await expect(extensionContract.connect(deployer).ownerMint(INITIAL_OWNER_MINTS, deployer.address))
            .to.be.revertedWith("OWNER_MINT_COMPLETE");        
        
        //Exhause public mints
        await extensionContract.connect(deployer).mint(1, {value: MINT_PRICE.toString()})
        await expect(extensionContract.connect(deployer).mint(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS, {value: MINT_PRICE.mul(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS).toString()}))
            .to.be.revertedWith("GENERATION_LOCKED");
    });

    it("Enforces mint limits with mixed order owner and public mints", async () => {

        await extensionContract.connect(deployer).ownerMint(1, deployer.address);
        await extensionContract.connect(deployer).mint(1, {value: MINT_PRICE.toString()})
        await expect(extensionContract.connect(deployer).mint(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS, {value: MINT_PRICE.mul(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS).toString()}))
            .to.be.revertedWith("GENERATION_LOCKED");
        await expect(extensionContract.connect(deployer).ownerMint(INITIAL_OWNER_MINTS, deployer.address))
            .to.be.revertedWith("OWNER_MINT_COMPLETE");        
        await extensionContract.connect(deployer).mint(1, {value: MINT_PRICE.toString()})
        await extensionContract.connect(deployer).ownerMint(INITIAL_OWNER_MINTS - 1, deployer.address);
        await expect(extensionContract.connect(deployer).ownerMint(1, deployer.address))
            .to.be.revertedWith("OWNER_MINT_COMPLETE");  
        await extensionContract.connect(deployer).mint(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS - 2, {value: MINT_PRICE.mul(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS - 2).toString()})
        await expect(extensionContract.connect(deployer).mint(1, {value: MINT_PRICE.toString()}))
            .to.be.revertedWith("GENERATION_LOCKED");
    });
  });

  describe("Fund Recoup", () => {

    const wallet = "0xd03ad2e11b0543ccc2827d0152ad9990ca6e8e6b";

    it("Can send ETH at owners direction", async () => {        
        const registrationCost = await extensionContract.REGISTRATION_COST();
        const eth = registrationCost;

        const beforeContractBalance = await ethers.provider.getBalance(extensionContract.address);
        const beforeWalletBalance = await ethers.provider.getBalance(wallet);

        await extensionContract.connect(user1).addExtension(extensions[0].address, {value: registrationCost});

        const afterContractBalance = await ethers.provider.getBalance(extensionContract.address);

        await extensionContract.connect(deployer).ethRecoup(wallet, eth);

        const afterRecoupContract = await ethers.provider.getBalance(extensionContract.address);
        const afterRecoupWallet = await ethers.provider.getBalance(wallet);

        expect(afterContractBalance.sub(beforeContractBalance)).to.be.equal(eth);
        expect(afterRecoupContract).to.be.equal(beforeContractBalance);
        expect(afterRecoupWallet).to.be.equal(beforeWalletBalance.add(eth));
    }); 

    it("Owner can only recoup ETH", async () => {
        const registrationCost = await extensionContract.REGISTRATION_COST();
        await expect(
            extensionContract.connect(user1).ethRecoup(wallet, registrationCost)
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Token Ids", () => {

    it("Start at 1 and end on the amount", async () => {

        //Exhaust owner mints
        await extensionContract.connect(deployer).ownerMint(1, deployer.address);

        await expect(extensionContract.tokenURI(1))
            .to.not.be.revertedWith("TOKEN_DOES_NOT_EXIST");
        
        //Exhause public mints
        await extensionContract.connect(deployer).mint(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS, {value: MINT_PRICE.mul(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS).toString()});
            
        await expect(extensionContract.tokenURI(INITIAL_TOTAL_MINTS))
            .to.not.be.revertedWith("TOKEN_DOES_NOT_EXIST");    

    });

    it("Start at 1 and end on the amount in subsequent generations", async () => {

        //Exhause public mints
        await extensionContract.connect(deployer).mint(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS, {value: MINT_PRICE.mul(INITIAL_TOTAL_MINTS - INITIAL_OWNER_MINTS).toString()});
                    
        const mintAmount = 13;
        const ownerMints = 5;
        await extensionContract.connect(deployer).nextGeneration(mintAmount, ownerMints);
           
        await extensionContract.connect(deployer).ownerMint(1, deployer.address);

        await expect(extensionContract.tokenURI(11))
            .to.not.be.revertedWith("TOKEN_DOES_NOT_EXIST");
    
        await extensionContract.connect(deployer).mint(mintAmount - ownerMints, {value: MINT_PRICE.mul(mintAmount - ownerMints).toString()});
        
        await expect(extensionContract.tokenURI(INITIAL_TOTAL_MINTS + mintAmount))
            .to.not.be.revertedWith("TOKEN_DOES_NOT_EXIST"); 
    });

  });
});

const ETHAmtString = (amount:number) => {    
    return ethers.utils.parseUnits(amount.toString(), 18).toString();
}
