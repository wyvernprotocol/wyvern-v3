/*

  Static array utils.

*/

pragma solidity >= 0.4.9;

import "../lib/ArrayUtils.sol";
import "../exchange/ExchangeCore.sol";

contract StaticArray {


    /* ~ */

    function dynamicMasked(address target, AuthenticatedProxy.HowToCall howToCall, bytes memory data, bytes memory calldataMask,
                           address countertarget, AuthenticatedProxy.HowToCall counterHowToCall, bytes memory countercalldata, bytes memory countercalldataMask,
                           address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address, uint)
        internal
        pure
    {

        require(call.target == target);
        require(call.howToCall == howToCall);
        ArrayUtils.guardedArrayReplace(data, call.data, calldataMask);
        require(ArrayUtils.arrayEq(data, call.data));
        
        require(countercall.target == countertarget);
        require(countercall.howToCall == counterHowToCall);
        ArrayUtils.guardedArrayReplace(countercalldata, countercall.data, countercalldataMask);
        require(ArrayUtils.arrayEq(countercalldata, countercall.data));

    }

}
