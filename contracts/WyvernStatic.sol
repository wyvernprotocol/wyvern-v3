/*

  << Wyvern Static >>

*/

pragma solidity 0.5.9;

import "./static/StaticExamples.sol";
import "./static/StaticERC20.sol";
import "./static/StaticERC721.sol";
import "./static/StaticUtil.sol";

/**
 * @title WyvernStatic
 * @author Wyvern Protocol Developers
 */
contract WyvernStatic is StaticExamples, StaticERC20, StaticERC721, StaticUtil {

    string public constant name = "Wyvern Static";

    constructor (address atomicizerAddress)
        public
    {
        atomicizer = atomicizerAddress;
    }

    function test () 
        public
        pure
    {
    }

}
