/*

    StaticERC20 - static calls for ERC20 trades

*/

pragma solidity 0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../lib/ArrayUtils.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticERC20 {

    /* This can be more efficient (no duplicated parameters) once https://github.com/ethereum/solidity/issues/3876 is implemented. */

    function swapExact(
        address[2] memory tokenGiveGet, uint[2] memory amountGiveGet,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[5] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
    {
        // Call target = token to give
        require(addresses[2] == tokenGiveGet[0]);
        // Call type = call
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call);
        // Decode call data
        (address transferDest, uint transferAmt) = abi.decode(data, (address, uint));
        // Transfer dest = counterparty
        require(transferDest == addresses[3]);
        // Transfer amount = give amount
        require(transferAmt == amountGiveGet[0]);

        // Countercall target = token to get
        require(addresses[4] == tokenGiveGet[1]);
        // Countercall type = call
        require(howToCalls[1] == AuthenticatedProxy.HowToCall.Call);
        // Decode countercall data
        (address counterTransferDest, uint counterTransferAmt) = abi.decode(counterdata, (address, uint));
        // Countertransfer dest = us
        require(counterTransferDest == addresses[1]);
        // Countertransfer amount = get amount
        require(counterTransferAmt == amountGiveGet[1]);
    }

    /*
        // Assert not past specified desired amount.
        require(SafeMath.sub(amountGiveGetDesiredRealized[1], amountGiveGetDesiredRealized[0]) >= 0);

        // Assert rate: amountGet / amountGive == desiredAmountGet / desiredAmountGive.
        // Calculated as amountGet * desiredAmountGive / amountGive == desiredAmountGet.
        require(SafeMath.div(SafeMath.mul(amountGiveGetDesiredRealized[3], amountGiveGetDesiredRealized[0]), amountGiveGetDesiredRealized[1]) == amountGiveGetDesiredRealized[2]);
    */

}
