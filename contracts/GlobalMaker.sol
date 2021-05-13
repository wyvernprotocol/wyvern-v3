/*

  << Global Maker >>

*/

pragma solidity 0.7.5;

import "./lib/EIP1271Mod.sol";
import "./lib/ArrayUtils.sol";
import "./registry/ProxyRegistry.sol";

/**
 * @title GlobalMaker
 * @author Wyvern Protocol Developers
 */
contract GlobalMaker is ERC1271Mod
	{
    bytes4 constant internal SIGINVALID = 0x00000000;

    string public constant name = "Global Maker";

    mapping (bytes4 => uint16) public sigMakerOffsets;

    /**
     * Construct a new GlobalMaker, creating the proxy it will require
     */
    constructor (ProxyRegistry registry, bytes4[] memory functionSignatures, uint16[] memory makerOffsets)
        public
	{
        require(functionSignatures.length > 0,"No function signatures passed, GlobalMaker would be inert.");
        require(functionSignatures.length == makerOffsets.length,"functionSignatures and makerOffsets lengths not equal");
        registry.registerProxy();
        for (uint index = 0 ; index < functionSignatures.length ; ++index)
        	sigMakerOffsets[functionSignatures[index]] = makerOffsets[index];
    }

    /** 
     * Check if a signature is valid
     *
     * @param _data Data signed over
     * @param _signature Encoded signature
     * @param _callData Original call data
     * @return magicValue Magic value if valid, zero-value otherwise
     */
    function isValidSignature(
        bytes memory _data,
        bytes memory _signature,
        bytes memory _callData)
        override
        public
        view
        returns (bytes4 magicValue)
    {
        bytes4 sig = _callData[0] |  bytes4(_callData[1]) >> 8 | bytes4(_callData[2]) >> 16 | bytes4(_callData[3]) >> 24;
        require(sigMakerOffsets[sig] != 0x00000000,"Unknown function signature");
        bytes32 hash = abi.decode(_data, (bytes32));
        (address maker) = abi.decode(ArrayUtils.arraySlice(_callData,sigMakerOffsets[sig],32),(address));
        (uint8 v, bytes32 r, bytes32 s) = abi.decode(_signature, (uint8, bytes32, bytes32));
        return (maker == ecrecover(hash, v, r, s)) ? MAGICVALUE : SIGINVALID;  
    }   

}