/*

  << Wyvern Exchange >>

*/

pragma solidity 0.5.1;

import "./exchange/Exchange.sol";

/**
 * @title WyvernExchange
 * @author Wyvern Protocol Developers
 */
contract WyvernExchange is Exchange {

    string public constant name = "Wyvern Exchange";
  
    string public constant version = "3.0";

    string public constant codename = "Ancalagon";

    /**
     */
    constructor (uint chainId, ProxyRegistryInterface registryAddr) public {
        DOMAIN_SEPARATOR = hash(EIP712Domain({
            name: "Wyvern Exchange",
            version: "3",
            chainId: chainId,
            verifyingContract: address(this)
        }));
        registry = registryAddr;
    }

}
