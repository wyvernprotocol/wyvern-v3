/*

  << Wyvern Atomicizer >>

  Execute multiple transactions, in order, atomically (if any fails, all revert).
  
  This can be used for implementing fees and royalties. E.g. instead of trading one
  ERC20 transferFrom() call for an ERC721 transferFrom() call, you can trade multiple
  ERC20 transferFrom() calls bundled into one call using this atomicizer (e.g. one 
  transferFrom() to the owner of the exchange, one to the creator of the NFT, and one
  to the current owne), for one ERC721 transferFrom() call.

  See `TestAtomicizer.sol` if you want this in contract form for deployment
*/

pragma solidity 0.7.5;

/**
 * @title WyvernAtomicizer
 * @author Wyvern Protocol Developers
 */
library WyvernAtomicizer {

    function atomicize (address[] calldata addrs, uint[] calldata values, uint[] calldata calldataLengths, bytes calldata calldatas)
        external
    {
        require(addrs.length == values.length && addrs.length == calldataLengths.length, "Addresses, calldata lengths, and values must match in quantity");

        uint j = 0;
        for (uint i = 0; i < addrs.length; i++) {
            bytes memory cd = new bytes(calldataLengths[i]);
            for (uint k = 0; k < calldataLengths[i]; k++) {
                cd[k] = calldatas[j];
                j++;
            }
            (bool success,) = addrs[i].call{value: values[i]}(cd);
            require(success, "Atomicizer subcall failed");
        }
    }

}
