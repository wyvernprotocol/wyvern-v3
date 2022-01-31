/*

  << TestERC1271 >>

*/

pragma solidity 0.7.5;

import "./lib/EIP1271.sol";

contract TestERC1271 is ERC1271 {

    bytes4 constant internal SIGINVALID = 0x00000000;

    address internal owner;

    /**
     * Set a new owner (for testing)
     *
     * @param ownerAddr Address of owner
     */
    function setOwner (address ownerAddr)
        public
    {
        owner = ownerAddr;
    }

    /**
     * Check if a signature is valid
     *
     * @param _hash Hash of the data to be signed
     * @param _signature Signature encoded as (bytes32 r, bytes32 s, uint8 v)
     * @return magicValue Magic value if valid, zero-value otherwise
     */
    function isValidSignature(
        bytes32 _hash,
        bytes memory _signature)
        override
        public
        view
        returns (bytes4 magicValue)
    {
        (uint8 v, bytes32 r, bytes32 s) = abi.decode(_signature, (uint8, bytes32, bytes32));
        if (owner == ecrecover(_hash, v, r, s)) {
            return MAGICVALUE;
        } else {
            return SIGINVALID;
        }
    }

}
