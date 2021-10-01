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

    function mintAndTransfer(address from, address to, uint256 id, string calldata uri, bytes calldata signature) public {
        bytes32 hash = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(id, uri)));
        require(ECDSA.recover(hash, signature) == from, "Signature failed to recover");
        _mint(to, id);
    }
}
