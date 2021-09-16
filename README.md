# Extension NFT

An experiment in community driven NFTs. When you can affect the look and rarity of your mint, where will your code fall? Creative Good or Developer Evil?

If you don't like how the NFTs are looking in this contract, change it! If you want to remove
a design from the overall render, you can. If you want to sign your name to the bottom of each new mint,
go for it.

This contract can be modified by adding/replacing/removing "extension" contracts. These contracts are passed a tokenId and generateId, and return a chunk of XML that will be included in the overall `<svg />` image. It can also return a chunk of JSON for adding attributes to the NFT.

Some rules and guidelines:

- Anyone can register an extension
- Only 8 render extensions can be registered at a time, with the oldest ones being removed as more are added
- Don't register something that can stop working or selfdestruct, that's no fun
- Please ensure your XML is not malformed, we aren't performing validation here
- Your JSON for attributes may be slightly malformed according to these guidelines:
  - If you have no attributes to add, return an empty string
  - Think of the JSON you are returning as entries in an array, but you are not including the `[` `]` brackets in your response, just the stringified objects
  - Your response should be prefixed with a `,`
  - As an example, if I wanted to include a new attribute of type `face` with a value of `happy` I would return:
    - `,{"trait_type": "face", "value": "happy"}`
  - If I wanted to include multiple attributes:
    - `,{"trait_type": "face", "value": "happy"},{"trait_type": "hair", "value": "brown"}`
  - Overall, the attributes should follow the OpenSea standards: `https://docs.opensea.io/docs/metadata-standards#attributes`

## Example Render Extension

See the default renderer for an example `/contracts/extensions/DefaultRenderExtension.sol`

## How to use

- Adding an extension
  - Deploy your contract
  - Call `addExtension()` with your contract address and the .2 ETH registratin fee
- Replacing an extension
  - Deploy your contract
  - Get the `currentExtensionSet()` from our contract
  - Get the index of the extension you want to replace by calling `getExtensionSetAddresses(extensionSetId)`, `extensionSetId` being the value you received from `currentExtensionSet()`
  - Call `replaceExtension()` passing the `index`, `existingExtensionAddress`, and your new contract address in that order, with the .2 ETH registration fee
- Removing an extension
  - Same as index finding dance as replace above, but call `removeExtension()` passing `index` and `existingExtensionAddress`, with the .2 ETH modification fee.

## We have left the contract upgradeable for the time being while we figure out how to share in the collected fee's

## Addresses

- Extension NFT: `0x66aC6646cd082C8B50356a8bB917E58650008483`
- ScriptChecker: `0x449b4980E59E93075484E1C7729987d846FBADD7`
- Default Render Extension: `0xBccb126E9E49e321e37AcA065839fE0C659c2880`
