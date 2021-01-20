/*

  << Global Maker >>

*/

pragma solidity 0.7.5;

import "./lib/EIP1271Mod.sol";

/**
 * @title GlobalMaker
 * @author Wyvern Protocol Developers
 */
contract GlobalMaker is ERC1271Mod {

    bytes4 constant internal SIGINVALID = 0x00000000;

    string public constant name = "Global Maker";

    /** 
     * Check if a signature is valid
     *
     * @param _data Data signed over
     * @param _signature Encoded signature
     * @return magicValue Magic value if valid, zero-value otherwise
     */
    function isValidSignature(
        bytes memory _data,
        bytes memory _signature,
        bytes memory _extradata)
        override
        public
        view
        returns (bytes4 magicValue)
    {
        // Decode what the user 
        // TODO
        bytes32 hash = abi.decode(_data, (bytes32));
        (uint8 v, bytes32 r, bytes32 s) = abi.decode(_signature, (uint8, bytes32, bytes32));
        if (address(0) == ecrecover(hash, v, r, s)) {
            return MAGICVALUE;
        } else {
            return SIGINVALID;
        }   
    }   

}
