/*

    StaticPayment - static calls for simple payments, auctions, and fees

*/

pragma solidity >= 0.4.9;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../lib/ArrayUtils.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticPayment {

    function payExact(
        address token, uint amount,
        address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory data, uint[4] memory)
        public
        pure
    {
        // Call target = token
        require(addresses[1] == token);
        // Call type = call
        require(howToCall == AuthenticatedProxy.HowToCall.Call);
        // Decode call data
        (address transferDest, uint transferAmt) = abi.decode(data, (address, uint));
        // Transfer dest = counterparty
        require(transferDest == addresses[2]);
        // Transfer amount = payment amount
        require(transferAmt == amount);
    }

    function payMinAuction(
        address token, uint[3] memory startEndExtra,
        address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory data, uint[4] memory)
        public
        pure
    {
        /* Calculate the auction price. */
        /* Require at least that much. */
    }

    function payMaxAuction(
        address token, uint[3] memory startEndExtra,
        address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory data, uint[4] memory)
        public
        pure
    {
        /* Calculate the auction price. */
        /* Require no more than that much. */
    }

    function payMakerTakerFee(
        address token, uint[3] memory makerTakerFee,
        address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory data, uint[4] memory)
        public
        pure
    {
        /* Decide if this order is the maker or the taker. */
        /* Require appropriate fee. */
    }

}
