/*

  << Wyvern Proxy Registry >>

*/

pragma solidity 0.5.9;

import "./registry/ProxyRegistry.sol";
import "./registry/AuthenticatedProxy.sol";

/**
 * @title WyvernRegistry
 * @author Wyvern Protocol Developers
 */
contract WyvernRegistry is ProxyRegistry {

    string public constant name = "Wyvern Protocol Proxy Registry";

    /* Whether the initial auth address has been set. */
    bool public initialAddressSet = false;

    constructor ()
        public
    {   
        delegateProxyImplementation = address (new AuthenticatedProxy());
    }   

    /** 
     * Grant authentication to the initial Exchange protocol contract
     *
     * @dev No delay, can only be called once - after that the standard registry process with a delay must be used
     * @param authAddress Address of the contract to grant authentication
     */
    function grantInitialAuthentication (address authAddress)
        onlyOwner
        public
    {   
        require(!initialAddressSet, "Wyvern Protocol Proxy Registry initial address already set");
        initialAddressSet = true;
        contracts[authAddress] = true;
    }   

}
