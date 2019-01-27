/*

    StaticERC20 - static calls for ERC20 trades

*/

pragma solidity 0.5.3;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../lib/ArrayUtils.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticERC20 {

    function swapExact(bytes memory extra,
        address[5] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        // Decode extradata
        (address[2] memory tokenGiveGet, uint[2] memory amountGiveGet) = abi.decode(extra, (address[2], uint[2]));

        // Call target = token to give
        require(addresses[1] == tokenGiveGet[0]);
        // Call type = call
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call);
        // Assert calldata
        require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("transferFrom(address,uint256,uint256)", addresses[0], addresses[2], amountGiveGet[0])));

        // Countercall target = token to get
        require(addresses[3] == tokenGiveGet[1]);
        // Countercall type = call
        require(howToCalls[1] == AuthenticatedProxy.HowToCall.Call);
        // Assert countercalldata
        require(ArrayUtils.arrayEq(counterdata, abi.encodeWithSignature("transferFrom(address,uint256,uint256)", addresses[2], addresses[0], amountGiveGet[1])));

        // Mark filled.
        return 1;
    }

}
