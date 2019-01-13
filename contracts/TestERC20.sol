/*

  << TestERC20 >>

*/

pragma solidity 0.5.1;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {

    /**
     */
    constructor () public {
    }

    /**
     */
    function mint(address to, uint256 value) public returns (bool) {
        _mint(to, value);
        return true;
    }

}
