/*

  << TestERC721 >>

*/
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

pragma solidity 0.7.5;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";

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

    function mintAndTransfer(address from, address to, uint256 id, string tokenURI, bytes signature) {
        // if sig recovers => mint
        // might also need to add a URI param in as a string but whatever
        bytes32 hash = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(id, tokenURI)));
        require(ECDSA.recover(hash, signature) == _signer, "Signature failed to recover");
        _mint(to, 0, id, "");
    }
}
