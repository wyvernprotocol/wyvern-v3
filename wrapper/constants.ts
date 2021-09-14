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