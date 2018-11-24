/*

  << Wyvern Atomicizer >>

  Execute multiple transactions, in order, atomically (if any fails, all revert).

*/

pragma solidity >= 0.4.9;

/**
 * @title WyvernAtomicizer
 * @author Wyvern Protocol Developers
 */
library WyvernAtomicizer {

    function atomicize (address[] memory addrs, uint[] memory values, uint[] memory calldataLengths, bytes memory calldatas)
        public
    {
        require(addrs.length == values.length && addrs.length == calldataLengths.length);

        uint j = 0;
        for (uint i = 0; i < addrs.length; i++) {
            bytes memory cd = new bytes(calldataLengths[i]);
            for (uint k = 0; k < calldataLengths[i]; k++) {
                cd[k] = calldatas[j];
                j++;
            }
            (bool success,) = addrs[i].call.value(values[i])(cd);
            require(success);
        }
    }

}
