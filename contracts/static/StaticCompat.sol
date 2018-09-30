/*

  Static compatibility.

*/

pragma solidity >= 0.4.9;

import "../lib/ArrayUtils.sol";
import "../exchange/ExchangeCore.sol";

contract StaticCompat {

    function masked(address target, AuthenticatedProxy.HowToCall desiredHowToCall, bytes memory data, bytes memory calldataMask, address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory cdata, uint[3] memory)
        public
        pure
    {
        require(addresses[1] == target);
        require(howToCall == desiredHowToCall);
        ArrayUtils.guardedArrayReplace(data, cdata, calldataMask);
        require(ArrayUtils.arrayEq(data, cdata));
    }

    function exact(address target, AuthenticatedProxy.HowToCall desiredHowToCall, bytes memory data, address[3] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory cdata, uint[3] memory)
        public
        pure
    {
        require(addresses[1] == target);
        require(howToCall == desiredHowToCall);
        require(ArrayUtils.arrayEq(data, cdata));
    }

}
