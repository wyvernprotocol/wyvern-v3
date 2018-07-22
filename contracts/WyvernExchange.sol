/*

  << Project Wyvern Exchange >>

*/

pragma solidity 0.4.24;

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
    constructor () public {
    }

}
