/*

  << TestERC1155 >>

*/

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract TestERC1155 is ERC1155("http://test/{id}.json") {

	/**
	 */
	constructor () public {
	}

	function mint(address to, uint256 tokenId) public returns (bool) {
		_mint(to, tokenId, 1, "");
		return true;
	}

	function mint(address to, uint256 tokenId, uint256 amount) public returns (bool) {
		_mint(to, tokenId, amount, "");
		return true;
	}

	function mint(address to, uint256 id, uint256 amount, string memory uri)
			public
	{
			address creator = address(uint160(id >> 96));
			require(creator == msg.sender || super.isApprovedForAll(creator, msg.sender), "Sender authorized to mint this token");
			_mint(to, id, amount, "");
	}
}
