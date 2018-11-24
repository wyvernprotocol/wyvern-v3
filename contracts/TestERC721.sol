/*

  << TestERC721 >>

*/

pragma solidity 0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Mintable.sol";

contract TestERC721 is ERC721Mintable {

    /**
     */
    constructor () public {
        _addMinter(msg.sender);
    }

}
