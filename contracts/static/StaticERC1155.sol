/*

StaticERC1155 - static calls for ERC1155 trades

*/

pragma solidity 0.7.5;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../lib/ArrayUtils.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticERC1155 {

function transferERC1155Exact(bytes memory extra,
	address[7] memory addresses, AuthenticatedProxy.HowToCall howToCall, uint[6] memory,
	bytes memory data)
	public
	pure
{
	// Decode extradata
	(address token, uint256 tokenId, uint256 amount) = abi.decode(extra, (address, uint256, uint256));

	// Call target = token to give
	require(addresses[2] == token);
	// Call type = call
	require(howToCall == AuthenticatedProxy.HowToCall.Call);
	// Assert calldata
	require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)", addresses[1], addresses[4], tokenId, amount, "")));
}

function swapOneForOneERC1155(bytes memory extra,
	address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
	bytes memory data, bytes memory counterdata)
	public
	pure
	returns (uint)
{
	// Zero-value
	require(uints[0] == 0);

	// Decode extradata
	(address[2] memory tokenGiveGet, uint256[2] memory nftGiveGet, uint256[2] memory nftAmounts) = abi.decode(extra, (address[2], uint256[2], uint256[2]));

	// Call target = token to give
	require(addresses[2] == tokenGiveGet[0], "ERC1155: call target must equal address of token to give");
	// Assert more than zero
	require(nftAmounts[0] > 0,"ERC1155: give amount must be larger than zero");
	// Call type = call
	require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC1155: call must be a direct call");
	// Assert calldata
	require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)", addresses[1], addresses[4], nftGiveGet[0], nftAmounts[0], "")));

	// Countercall target = token to get
	require(addresses[5] == tokenGiveGet[1], "ERC1155: countercall target must equal address of token to get");
	// Assert more than zero
	require(nftAmounts[1] > 0,"ERC1155: take amount must be larger than zero");
	// Countercall type = call
	require(howToCalls[1] == AuthenticatedProxy.HowToCall.Call, "ERC1155: countercall must be a direct call");
	// Assert countercalldata
	require(ArrayUtils.arrayEq(counterdata, abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)", addresses[4], addresses[1], nftGiveGet[1], nftAmounts[1], "")));

	// Mark filled
	return 1;
}

function swapOneForOneERC1155Decoding(bytes memory extra,
	address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
	bytes memory data, bytes memory counterdata)
	public
	pure
	returns (uint)
{
	// Calculate function signature
	bytes memory sig = ArrayUtils.arrayTake(abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)"), 4);

	// Zero-value
	require(uints[0] == 0);

	// Decode extradata
	(address[2] memory tokenGiveGet, uint256[2] memory nftGiveGet, uint256[2] memory nftAmounts) = abi.decode(extra, (address[2],uint256[2],uint256[2]));

	// Call target = token to give
	require(addresses[2] == tokenGiveGet[0], "ERC1155: call target must equal address of token to give");
	// Call type = call
	require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC1155: call must be a direct call");
	// Assert signature
	require(ArrayUtils.arrayEq(sig, ArrayUtils.arrayTake(data, 4)));
	// Decode and assert calldata	
	require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)", addresses[1], addresses[4], nftGiveGet[0], nftAmounts[0], "")));
	// Decode and assert countercalldata
	require(ArrayUtils.arrayEq(counterdata, abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)", addresses[4], addresses[1], nftGiveGet[1], nftAmounts[1], "")));

	// Mark filled
	return 1;
}

}
