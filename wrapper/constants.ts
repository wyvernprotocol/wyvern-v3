import { BigNumber } from 'ethers';
import { Interface } from "ethers/lib/utils";
import ERC20ABI from "../dist/build/abis/ERC20.json";
import ERC721ABI from "../dist/build/abis/TestERC721.json"; // should be a forge ERC721 contract
import ERC1155ABI from "../dist/build/abis/TestERC1155.json"; // should be a forge ERC1155 contract

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const eip712Order = {
  name: 'Order',
  fields: [
    { name: 'registry', type: 'address' },
    { name: 'maker', type: 'address' },
    { name: 'staticTarget', type: 'address' },
    { name: 'staticSelector', type: 'bytes4' },
    { name: 'staticExtradata', type: 'bytes' },
    { name: 'maximumFill', type: 'uint256' },
    { name: 'listingTime', type: 'uint256' },
    { name: 'expirationTime', type: 'uint256' },
    { name: 'salt', type: 'uint256' }
  ]
};

export const anyERC1155ForERC20Selector = '0x23b04789';
export const anyERC20ForERC1155Selector = '0x7a7f30e0';
export const ERC721ForERC20Selector = '0xc3d3626a';
export const ERC20ForERC721Selector = '0xa6139b58';
export const anyERC20ForERC20Selector = '0xb9845b95';
export const LazyERC721ForERC20Selector = '0x418c3221';
export const LazyERC20ForERC721Selector = '0x74d6407a';
export const LazyERC1155ForERC20Selector = '0xc79dc1b9';
export const LazyERC20ForERC1155Selector = '0x2b9233c9';

export const ERC20Interface = new Interface(ERC20ABI);
export const ERC721Interface = new Interface(ERC721ABI);
export const ERC1155Interface = new Interface(ERC1155ABI);

export const tokenTypes = {
  ERC20: 'ERC20',
  ERC721: 'ERC721',
  ERC1155: 'ERC1155',
};

export const zero = BigNumber.from('0');
