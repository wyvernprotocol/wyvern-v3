/*

  Static array utils.

*/

pragma solidity 0.4.24;

import "../lib/ArrayUtils.sol";
import "../exchange/ExchangeCore.sol";

contract StaticArray {


    /* ~ */

    function dynamicMasked(address target, AuthenticatedProxy.HowToCall howToCall, bytes calldata, bytes calldataMask,
                           address countertarget, AuthenticatedProxy.HowToCall counterHowToCall, bytes countercalldata, bytes countercalldataMask,
                           address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address, uint)
        internal
        pure
    {

        require(call.target == target);
        require(call.howToCall == howToCall);
        ArrayUtils.guardedArrayReplace(calldata, call.calldata, calldataMask);
        require(ArrayUtils.arrayEq(calldata, call.calldata));
        
        require(countercall.target == countertarget);
        require(countercall.howToCall == counterHowToCall);
        ArrayUtils.guardedArrayReplace(countercalldata, countercall.calldata, countercalldataMask);
        require(ArrayUtils.arrayEq(countercalldata, countercall.calldata));

    }

}
