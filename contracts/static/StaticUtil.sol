/*

    StaticUtil - static call utility contract

*/

pragma solidity 0.4.24;

import "../lib/StaticCaller.sol";
import "../registry/AuthenticatedProxy.sol";
import "../exchange/ExchangeCore.sol";

contract StaticUtil is StaticCaller {

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

}
