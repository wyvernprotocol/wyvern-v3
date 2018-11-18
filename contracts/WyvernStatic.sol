/*

  << Project Wyvern Static >>

*/

pragma solidity >= 0.4.9;

import "./static/StaticCompat.sol";
import "./static/StaticERC20.sol";
import "./static/StaticERC721.sol";
import "./static/StaticUtil.sol";

/**
 * @title WyvernStatic
 * @author Wyvern Protocol Developers
 */
contract WyvernStatic is StaticCompat, StaticERC20, StaticERC721, StaticUtil {

    string public constant name = "Wyvern Static";

    /**
     */
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
