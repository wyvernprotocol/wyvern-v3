/*

    StaticUtil - static call utility contract

*/

pragma solidity 0.5.0;

import "../lib/StaticCaller.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticUtil is StaticCaller {

    address public atomicizer;

    function any(address[7] memory, AuthenticatedProxy.HowToCall[2] memory, uint[5] memory, bytes memory, bytes memory)
        public
        pure
        returns (uint)
    {
        /* Accept any call.
           Useful e.g. for matching-by-transaction, where you authorize the counter-call by sending the transaction and don't need to re-check it.
           Might be more efficient to implement in ExchangeCore. */

        return 1;
    }

    function split(address firstTarget, bytes memory firstExtradata, address secondTarget, bytes memory secondExtradata,
                   address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[5] memory uints,
                   bytes memory data, bytes memory counterdata)
        public
    {
        /* Split into two static calls: one for the call, one for the counter-call, both with metadata. */

        /* Static call to check the call. */
        require(staticCall(firstTarget, abi.encodePacked(firstExtradata, [addresses[0], addresses[1], addresses[2], addresses[6]], howToCalls[0], data, uints)));

        /* Static call to check the counter-call. */
        require(staticCall(secondTarget, abi.encodePacked(secondExtradata, [addresses[3], addresses[4], addresses[5], addresses[6]], howToCalls[1], counterdata, uints)));
    }

    function and(address[] memory addrs, uint[] memory extradataLengths, bytes memory extradatas, bytes memory rest)
        public
    {
        require(addrs.length == extradataLengths.length);
        
        uint j = 0;
        for (uint i = 0; i < addrs.length; i++) {
            bytes memory extradata = new bytes(extradataLengths[i]);
            for (uint k = 0; k < extradataLengths[i]; k++) {
                extradata[k] = extradatas[j];
                j++;
            }
            require(staticCall(addrs[i], abi.encodePacked(extradata, rest)));
        } 
    }

    function or(address[] memory addrs, uint[] memory extradataLengths, bytes memory extradatas, bytes memory rest)
        public
    {
        require(addrs.length == extradataLengths.length);
        
        uint j = 0;
        for (uint i = 0; i < addrs.length; i++) {
            bytes memory extradata = new bytes(extradataLengths[i]);
            for (uint k = 0; k < extradataLengths[i]; k++) {
                extradata[k] = extradatas[j];
                j++;
            }
            if (staticCall(addrs[i], abi.encodePacked(extradata, rest))) {
                return;
            }
        }

        revert();
    }

    function sequenceExact(address[] memory addrs, uint[] memory extradataLengths, bytes memory extradatas, address[4] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory cdata, uint[5] memory uints)
        public
    {
        /* Assert DELEGATECALL to atomicizer library with given call sequence, split up predicates accordingly.
           e.g. transferring two CryptoKitties in sequence. */

        require(addrs.length == extradataLengths.length);

        (address[] memory caddrs, uint[] memory cvals, uint[] memory clengths, bytes memory calldatas) = abi.decode(cdata, (address[], uint[], uint[], bytes));

        require(addresses[1] == atomicizer);
        require(howToCall == AuthenticatedProxy.HowToCall.DelegateCall);
        require(addrs.length == caddrs.length); // Exact calls only

        sequence(addrs, extradataLengths, extradatas, caddrs, cvals, clengths, calldatas, addresses, uints);
    }

    function sequenceAnyAfter(address[] memory addrs, uint[] memory extradataLengths, bytes memory extradatas, address[4] memory addresses, AuthenticatedProxy.HowToCall howToCall, bytes memory cdata, uint[5] memory uints)
        public
    {
        /* Assert DELEGATECALL to atomicizer library with given call sequence, split up predicates accordingly.
           e.g. transferring two CryptoKitties in sequence. */

        require(addrs.length == extradataLengths.length);

        (address[] memory caddrs, uint[] memory cvals, uint[] memory clengths, bytes memory calldatas) = abi.decode(cdata, (address[], uint[], uint[], bytes));

        require(addresses[1] == atomicizer);
        require(howToCall == AuthenticatedProxy.HowToCall.DelegateCall);
        require(addrs.length <= caddrs.length); // Extra calls OK

        sequence(addrs, extradataLengths, extradatas, caddrs, cvals, clengths, calldatas, addresses, uints);
    }

    function sequence(address[] memory addrs, uint[] memory extradataLengths, bytes memory extradatas, address[] memory caddrs, uint[] memory cvals, uint[] memory clengths, bytes memory calldatas, address[4] memory addresses, uint[5] memory uints)
        internal
    {
        uint j = 0;
        uint l = 0;
        for (uint i = 0; i < addrs.length; i++) {
            bytes memory extradata = new bytes(extradataLengths[i]);
            for (uint k = 0; k < extradataLengths[i]; k++) {
                extradata[k] = extradatas[j];
                j++;
            }
            bytes memory data = new bytes(clengths[i]);
            for (uint m = 0; m < clengths[i]; m++) {
                data[m] = calldatas[l];
                l++;
            }
            // Not supported in the standard interface.
            require(cvals[i] == 0);
            address[3] memory taddrs = [addresses[0], caddrs[i], addresses[2]];
            require(staticCall(addrs[i], abi.encodePacked(extradata, taddrs, AuthenticatedProxy.HowToCall.Call, data, uints)));
        }
    }

}
