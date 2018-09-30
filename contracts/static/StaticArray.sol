/*

  Static array utils.

*/

pragma solidity >= 0.4.9;
pragma experimental ABIEncoderV2;

import "../lib/ArrayUtils.sol";
import "../exchange/ExchangeCore.sol";

contract StaticArray {

    function masked(address target, AuthenticatedProxy.HowToCall howToCall, bytes memory data, bytes memory calldataMask, address, ExchangeCore.Call memory call, ExchangeCore.Metadata memory)
        internal
        pure
    {
        require(call.target == target);
        require(call.howToCall == howToCall);
        ArrayUtils.guardedArrayReplace(data, call.data, calldataMask);
        require(ArrayUtils.arrayEq(data, call.data));
    }

}
