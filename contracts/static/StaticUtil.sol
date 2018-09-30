/*

    StaticUtil - static call utility contract

*/

pragma solidity >= 0.4.9;

pragma experimental ABIEncoderV2;

import "../lib/StaticCaller.sol";
import "../registry/AuthenticatedProxy.sol";
import "../exchange/ExchangeCore.sol";

contract StaticUtil is StaticCaller {

    address public atomicizer;

    function any(address, ExchangeCore.Call memory, address, ExchangeCore.Call memory, address, uint, uint, uint)
        internal
        pure
    {
        /* Accept any call.
           Useful e.g. for matching-by-transaction, where you authorize the counter-call by sending the transaction and don't need to re-check it.
           Might be more efficient to implement in ExchangeCore. */
    }

    function split(StaticCaller.StaticSpec memory callSpec, StaticCaller.StaticSpec memory countercallSpec, StaticCaller.StaticSpec memory matcherValueSpec,
                   address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, ExchangeCore.Metadata memory metadata)
        public
        view
    {
        /* Split into two static calls: one for the call, one for the counter-call, both with metadata. */

        /* Static call to check the call. */
        require(staticCall(callSpec.target, abi.encodePacked(callSpec.extradata, caller, call.target, call.howToCall, call.data, metadata.matcher, metadata.value, metadata.listingTime, metadata.expirationTime)));

        /* Static call to check the counter-call. */
        require(staticCall(countercallSpec.target, abi.encodePacked(countercallSpec.extradata, counterparty, countercall.target, countercall.howToCall, countercall.data, metadata.matcher, metadata.value, metadata.listingTime, metadata.expirationTime)));
    }

    function and(address[] memory addrs, uint[] memory extradataLengths, bytes memory extradatas, bytes memory rest)
        internal 
        view
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
        internal 
        view
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

    function sequenceExact(address[] memory addrs, uint[] memory extradataLengths, bytes memory extradatas, address caller, ExchangeCore.Call memory call, ExchangeCore.Metadata memory metadata)
        internal
        view
    {
        /* Assert DELEGATECALL to atomicizer library with given call sequence, split up predicates accordingly.
           e.g. transferring two CryptoKitties in sequence. */

        require(addrs.length == extradataLengths.length);

        (address[] memory caddrs, uint[] memory cvals, uint[] memory clengths, bytes memory calldatas) = abi.decode(call.data, (address[], uint[], uint[], bytes));

        require(call.target == atomicizer);
        require(call.howToCall == AuthenticatedProxy.HowToCall.DelegateCall);
        require(addrs.length == caddrs.length);

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
            // TODO How to deal with value
            require(staticCall(addrs[i], abi.encodePacked(extradata, caller, caddrs[i], AuthenticatedProxy.HowToCall.Call, data, metadata.matcher, metadata.value, metadata.listingTime, metadata.expirationTime)));
        }

    }

    function sequenceAnyAfter(address[] memory addrs, uint[] memory extradataLengths, bytes memory extradatas, address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address matcher, uint value, uint, uint)
        internal
        view
    {
        /* Assert DELEGATECALL to atomicizer library with given call sequence and any extra subsequent calls (TODO)
           e.g. transferring a CryptoKitty, then paying a fee, counterparty doesn't care about the fee. */
    }

}
