/*

    StaticPayment - static calls for simple payments, auctions, and fees

*/

pragma solidity 0.5.9;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../lib/ArrayUtils.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticPayment {

    function payExact(
        bytes memory extra,
        address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory data, uint[6] memory)
        public
        pure
    {
        (address token, uint amount) = abi.decode(extra, (address, uint));

        // Call target = token
        require(addresses[1] == token);
        // Call type = call
        require(howToCall == AuthenticatedProxy.HowToCall.Call);
        // Decode call data
        (address transferDest, uint transferAmt) = abi.decode(ArrayUtils.arrayDrop(data, 4), (address, uint));
        // Transfer dest = counterparty
        require(transferDest == addresses[2]);
        // Transfer amount = payment amount
        require(transferAmt == amount);
    }

    function payExactEther(
        uint amount,
        address[3] memory, AuthenticatedProxy.HowToCall, bytes memory, uint[6] memory uints)
        public
        pure
    {
        // Amount is correct
        require(uints[0] == amount);
    }

    function payMinAuctionEther(

        )
        public
        pure
    {
        // decode token, amount vs. time
    }

    function payMaxAuctionEther(
        )
        public
        pure
    {
        // decode token, amount vs. time
    }

    function payMinAuction(
        bytes memory extra,
        address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory data, uint[6] memory)
        public
        pure
    {
        /* Calculate the auction price. */
        /* Require at least that much. */
    }

    function payMaxAuction(
        bytes memory extra,
        address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory data, uint[6] memory)
        public
        pure
    {
        /* Calculate the auction price. */
        /* Require no more than that much. */
    }

    function payMakerTakerFee(
        bytes memory extra,
        address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory data, uint[6] memory)
        public
        pure
    {
        /* Decide if this order is the maker or the taker. */
        /* Require appropriate fee. */
    }

}
