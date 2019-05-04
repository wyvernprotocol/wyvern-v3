/*

  << TestERC1271 >>

*/

pragma solidity 0.5.7;

import "./lib/EIP1271.sol";

contract TestERC1271 is ERC1271 {

    bytes4 constant internal MAGICVALUE = 0x20c13b0b;

    /**
     */
    constructor () public {
    }

    function isValidSignature(
        bytes memory _data,
        bytes memory _signature)
        public
        view
        returns (bytes4 magicValue)
    {
        return MAGICVALUE;
    }

}
