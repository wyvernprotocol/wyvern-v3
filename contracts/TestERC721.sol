/*

  << TestERC721 >>

*/

pragma solidity >= 0.4.9;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Mintable.sol";

contract TestERC721 is ERC721Mintable {

    /**
     */
    constructor () public {
        _addMinter(msg.sender);
    }

}
