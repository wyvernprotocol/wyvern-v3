/*

  << Static Market contract >>

*/

pragma solidity 0.7.5;

import "./static/StaticUtil.sol";

/**
 * @title StaticMarket
 * @author Wyvern Protocol Developers
 */
contract StaticMarket is StaticUtil {

    string public constant name = "Static Market";

	constructor (address atomicizerAddress)
		public
	{
		atomicizer = atomicizerAddress;
	}

	function anyERC1155ForERC20(bytes memory extra,
		address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
		bytes memory data, bytes memory counterdata)
		public
		pure
		returns (uint)
	{
		require(uints[0] == 0,"anyERC1155ForERC20: Zero value required");
		require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "anyERC1155ForERC20: call must be a direct call");

		(uint8 direction, address[2] memory tokenGiveGet, uint256[2] memory nftIdAndPrice) = abi.decode(extra, (uint8, address[2], uint256[2]));

		require(nftIdAndPrice[1] > 0,"anyERC1155ForERC20: ERC1155 price must be larger than zero");

		uint256 new_fill;

		if (direction == 0){
			require(addresses[2] == tokenGiveGet[0], "anyERC1155ForERC20: call target must equal address of token to give");
			require(addresses[5] == tokenGiveGet[1], "anyERC1155ForERC20: countercall target must equal address of token to get");
			uint256[2] memory call_amounts = [
				getERC1155AmountFromCalldata(data),
				getERC20AmountFromCalldata(counterdata)
			];
			new_fill = SafeMath.add(uints[5],call_amounts[0]);
			require(new_fill <= uints[1],"anyERC1155ForERC20: new fill exceeds maximum fill");
			checkERC1155Side(data,addresses[1],addresses[4],nftIdAndPrice[0],call_amounts[0]);
			checkERC20Side(counterdata,addresses[4],addresses[1],SafeMath.mul(call_amounts[0],nftIdAndPrice[1]));
		}
		else{
			require(addresses[5] == tokenGiveGet[0], "anyERC1155ForERC20: call target must equal address of token to get");
			require(addresses[2] == tokenGiveGet[1], "anyERC1155ForERC20: countercall target must equal address of token to give");
			uint256[2] memory call_amounts = [
				getERC1155AmountFromCalldata(counterdata),
				getERC20AmountFromCalldata(data)
			];
			new_fill = SafeMath.add(uints[5],call_amounts[1]);
			require(new_fill <= uints[1],"anyERC1155ForERC20: new fill exceeds maximum fill");
			checkERC1155Side(counterdata,addresses[4],addresses[1],nftIdAndPrice[0],call_amounts[0]);
			checkERC20Side(data,addresses[1],addresses[4],SafeMath.mul(call_amounts[0],nftIdAndPrice[1]));
		}	
		
		return new_fill;
	}

	function getERC1155AmountFromCalldata(bytes memory data)
		internal
		pure
		returns (uint256)
	{
		(uint256 amount) = abi.decode(ArrayUtils.arraySlice(data,100,32),(uint256));
		return amount;
	}

	function getERC20AmountFromCalldata(bytes memory data)
		internal
		pure
		returns (uint256)
	{
		(uint256 amount) = abi.decode(ArrayUtils.arraySlice(data,68,32),(uint256));
		return amount;
	}

	function checkERC1155Side(bytes memory data, address from, address to, uint256 nftId, uint256 amount)
		internal
		pure
	{
		require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)", from, to, nftId, amount, "")));
	}

	function checkERC20Side(bytes memory data, address from, address to, uint256 amount)
		internal
		pure
	{
		require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
	}
}
