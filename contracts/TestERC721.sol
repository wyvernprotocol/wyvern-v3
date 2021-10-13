/*

  << TestERC721 >>

*/

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract TestERC721 is ERC721("test", "TST") {

    /**
     */
    constructor () public {
        mint(msg.sender, 1);
        mint(msg.sender, 2);
        mint(msg.sender, 3);
    }

    /**
     */
    function mint(address to, uint256 tokenId) public returns (bool) {
        _mint(to, tokenId);
        return true;
    }

    function mint(address to, uint256 tokenId, string memory uri) public {
        address creator = address(uint160(tokenId >> 96));
        require(creator == msg.sender || super.isApprovedForAll(creator, msg.sender), "Sender not authorized to mint this token");
        _safeMint(to, tokenId);
    }
}
