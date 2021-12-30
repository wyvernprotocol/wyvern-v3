/*

  << Wyvern Exchange >>

*/

pragma solidity 0.7.5;

import "./exchange/Exchange.sol";

/**
 * @title WyvernExchange
 * @author Wyvern Protocol Developers
 */
contract WyvernExchange is Exchange {

    string public constant name = "Wyvern Exchange";
  
    string public constant version = "3.1";

    string public constant codename = "Ancalagon";

    /**
     * @param chainId the chainId where this is being deployed
     * @param registryAddrs a list of the registries that this exchange will be compatible with. Must be mutual (i.e. this exchange must be an approved caller of the registry and vice versa)
     * @param customPersonalSignPrefix not important if you are using EIP 712 signatures
     */
    constructor (uint chainId, address[] memory registryAddrs, bytes memory customPersonalSignPrefix) public {
        DOMAIN_SEPARATOR = hash(EIP712Domain({
            name              : name,
            version           : version,
            chainId           : chainId,
            verifyingContract : address(this)
        }));
        for (uint ind = 0; ind < registryAddrs.length; ind++) {
          registries[registryAddrs[ind]] = true;
        }
        if (customPersonalSignPrefix.length > 0) {
          personalSignPrefix = customPersonalSignPrefix;
        }
    }

}
