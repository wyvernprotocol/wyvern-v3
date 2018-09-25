/*

    StaticUtil - static call utility contract

*/

pragma solidity 0.4.24;

import "../lib/StaticCaller.sol";
import "../registry/AuthenticatedProxy.sol";
import "../exchange/ExchangeCore.sol";

contract StaticUtil is StaticCaller {

    function any(address, ExchangeCore.Call, address, ExchangeCore.Call, address, uint)
        internal
        pure
    {
        /* Accept any call.
           Useful e.g. for matching-by-transaction, where you authorize the counter-call by sending the transaction and don't need to re-check it.
           Might be more efficient to implement in ExchangeCore. */
    }

    function split(address staticTargetForCall, bytes extradataForCall, address staticTargetForCounterCall, bytes extradataForCounterCall, address staticTargetForMatcherValue, bytes extradataForMatcherValue,
                   address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address matcher, uint value)
        internal
        view
    {
        /* Split into three static calls: one for the call, one for the counter-call, and one for the matcher/value. */

        /* Static call to check the call. */
        require(staticCall(staticTargetForCall, abi.encodePacked(extradataForCall, caller, call.target, call.howToCall, call.calldata)));

        /* Static call to check the counter-call. */
        require(staticCall(staticTargetForCounterCall, abi.encodePacked(extradataForCounterCall, counterparty, countercall.target, countercall.howToCall, countercall.calldata)));

        /* Static call to check the matcher & value. */
        require(staticCall(staticTargetForMatcherValue, abi.encodePacked(extradataForMatcherValue, matcher, value)));
    }

    function and(address[] addrs, uint[] extradataLengths, bytes extradatas, address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address matcher, uint value)
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
            require(staticCall(addrs[i], abi.encodePacked(extradata, caller, call.target, call.howToCall, call.calldata, counterparty, countercall.target, countercall.howToCall, countercall.calldata, matcher, value)));
        } 

    }

    function or(address[] addrs, uint[] extradataLengths, bytes extradatas, address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address matcher, uint value)
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
            if (staticCall(addrs[i], abi.encodePacked(extradata, caller, call.target, call.howToCall, call.calldata, counterparty, countercall.target, countercall.howToCall, countercall.calldata, matcher, value))) {
                return;
            }
        }

        revert();

    }

    function sequenceExact(address[] addrs, uint[] extradataLengths, bytes extradatas, address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address matcher, uint value)
        internal
        view
    {
        /* Assert DELEGATECALL to atomicizer library with given call sequence, split up predicates accordingly (TODO).
           e.g. transferring two CryptoKitties in sequence. */
    }

    function sequenceAnyAfter(address[] addrs, uint[] extradataLengths, bytes extradatas, address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address matcher, uint value)
        internal
        view
    {
        /* Assert DELEGATECALL to atomicizer library with given first call and any extra subsequent calls (TODO)
           e.g. transferring a CryptoKitty, then paying a fee, counterparty doesn't care about the fee. */
    }

}
