/*

    StaticERC20 - static calls for ERC20 trades

*/

pragma solidity >= 0.4.9;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../lib/ArrayUtils.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticERC20 {

    /* This can be more efficient (no duplicated parameters) once https://github.com/ethereum/solidity/issues/3876 is implemented. */

    /* TODO Refactor */

    function swapByRateCapped(address[2] memory tokenGiveGet, uint[4] memory amountGiveGetDesiredRealized, address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address, uint, uint, uint)
        internal
        pure
    {

        /* Assert not past specified desired amount. */
        require(SafeMath.sub(amountGiveGetDesiredRealized[1], amountGiveGetDesiredRealized[0]) >= 0);

        /* Assert rate: amountGet / amountGive == desiredAmountGet / desiredAmountGive.
           Calculated as amountGet * desiredAmountGive / amountGive == desiredAmountGet. */
        require(SafeMath.div(SafeMath.mul(amountGiveGetDesiredRealized[3], amountGiveGetDesiredRealized[0]), amountGiveGetDesiredRealized[1]) == amountGiveGetDesiredRealized[2]);

        /* Assert call is correct. */
        require(call.target == tokenGiveGet[0]);
        require(call.howToCall == AuthenticatedProxy.HowToCall.Call);
        require(ArrayUtils.arrayEq(call.data, abi.encodeWithSignature("transfer(address,uint256)", counterparty, amountGiveGetDesiredRealized[1])));

        /* Assert counter-call is correct. */
        require(countercall.target == tokenGiveGet[1]);
        require(countercall.howToCall == AuthenticatedProxy.HowToCall.Call);
        require(ArrayUtils.arrayEq(countercall.data, abi.encodeWithSignature("transfer(address,uint256)", caller, amountGiveGetDesiredRealized[3])));

    }

    function swapByRateNoCap(address[2] memory tokenGiveGet, uint[4] memory amountGiveGetDesiredRealized, address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address, uint, uint, uint)
        internal
        pure
    {

        /* Assert rate: amountGet / amountGive == desiredAmountGet / desiredAmountGive.
           Calculated as amountGet * desiredAmountGive / amountGive == desiredAmountGet. */
        require(SafeMath.div(SafeMath.mul(amountGiveGetDesiredRealized[3], amountGiveGetDesiredRealized[0]), amountGiveGetDesiredRealized[1]) == amountGiveGetDesiredRealized[2]);

        /* Assert call is correct. */
        require(call.target == tokenGiveGet[0]);
        require(call.howToCall == AuthenticatedProxy.HowToCall.Call);
        require(ArrayUtils.arrayEq(call.data, abi.encodeWithSignature("transfer(address,uint256)", counterparty, amountGiveGetDesiredRealized[1])));

        /* Assert counter-call is correct. */
        require(countercall.target == tokenGiveGet[1]);
        require(countercall.howToCall == AuthenticatedProxy.HowToCall.Call);
        require(ArrayUtils.arrayEq(countercall.data, abi.encodeWithSignature("transfer(address,uint256)", caller, amountGiveGetDesiredRealized[3])));

    }

    function swapExact(address[2] memory tokenGiveGet, uint[2] memory amountGiveGet, address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address, uint, uint, uint)
        internal
        pure
    {

        /* Assert call is correct. */
        require(call.target == tokenGiveGet[0]);
        require(call.howToCall == AuthenticatedProxy.HowToCall.Call);
        require(ArrayUtils.arrayEq(call.data, abi.encodeWithSignature("transfer(address,uint256)", counterparty, amountGiveGet[0])));

        /* Assert counter-call is correct. */
        require(countercall.target == tokenGiveGet[1]);
        require(countercall.howToCall == AuthenticatedProxy.HowToCall.Call);
        require(ArrayUtils.arrayEq(countercall.data, abi.encodeWithSignature("transfer(address,uint256)", caller, amountGiveGet[1])));

    }

}
