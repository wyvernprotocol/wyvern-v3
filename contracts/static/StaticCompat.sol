/*

  Static compatibility.

*/

pragma solidity 0.5.4;

import "../lib/ArrayUtils.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticCompat {

    enum SaleKind { FixedPrice, DutchAuction }

    // v2compat method set only supports the split fee method

    // todo calculate maker/taker

    function v2compatBuySideCall(
        uint basePrice, uint extra, SaleKind saleKind, uint maximumFee,
        address target, AuthenticatedProxy.HowToCall desiredHowToCall, bytes memory data, bytes memory calldataMask,
        address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory cdata, uint[4] memory)
        public
        pure
    {
        /* Check payment & fee payment. */
    }

    function v2compatBuySideCounterCall (
        uint basePrice, uint extra, SaleKind saleKind, uint maximumFee,
        address target, AuthenticatedProxy.HowToCall desiredHowToCall, bytes memory data, bytes memory calldataMask,
        address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory cdata, uint[4] memory)
        public
        pure
    {
        /* Check calldata replacement. */
        require(addresses[1] == target);
        require(howToCall == desiredHowToCall);
        ArrayUtils.guardedArrayReplace(data, cdata, calldataMask);
        require(ArrayUtils.arrayEq(data, cdata));
    }

    function masked(address target, AuthenticatedProxy.HowToCall desiredHowToCall, bytes memory data, bytes memory calldataMask, address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory cdata, uint[4] memory)
        public
        pure
    {
        require(addresses[1] == target);
        require(howToCall == desiredHowToCall);
        ArrayUtils.guardedArrayReplace(data, cdata, calldataMask);
        require(ArrayUtils.arrayEq(data, cdata));
    }

    function exact(address target, AuthenticatedProxy.HowToCall desiredHowToCall, bytes memory data, address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory cdata, uint[4] memory)
        public
        pure
    {
        require(addresses[1] == target);
        require(howToCall == desiredHowToCall);
        require(ArrayUtils.arrayEq(data, cdata));
    }

}
