/*

    StaticERC20 - static calls for ERC20 trades

*/

pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../lib/ArrayUtils.sol";
import "../exchange/ExchangeCore.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticERC20 {

    function swap(address[2] tokenGiveGet, uint[4] amountGiveGetDesiredRealized, address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address, uint)
        internal
        pure
    {

        /* Assert rate: amountGet / amountGive == desiredAmountGet / desiredAmountGive.
           Calculated as amountGet * desiredAmountGive / amountGive == desiredAmountGet. */
        require(SafeMath.div(SafeMath.mul(amountGiveGetDesiredRealized[3], amountGiveGetDesiredRealized[0]), amountGiveGetDesiredRealized[1]) == amountGiveGetDesiredRealized[2]);

        /* Assert call is correct. */
        require(call.target == tokenGiveGet[0]);
        require(call.howToCall == AuthenticatedProxy.HowToCall.Call);
        require(ArrayUtils.arrayEq(call.calldata, abi.encodeWithSignature("transfer(address,uint256)", counterparty, amountGiveGetDesiredRealized[1])));

        /* Assert counter-call is correct. */
        require(countercall.target == tokenGiveGet[1]);
        require(countercall.howToCall == AuthenticatedProxy.HowToCall.Call);
        require(ArrayUtils.arrayEq(countercall.calldata, abi.encodeWithSignature("transfer(address,uint256)", caller, amountGiveGetDesiredRealized[3])));

    }

}
