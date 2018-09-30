/*

    StaticERC721 - static calls for ERC721 trades

*/

pragma solidity >= 0.4.9;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../lib/ArrayUtils.sol";
import "../exchange/ExchangeCore.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticERC20 {

    /* This can be more efficient (no duplicated parameters) once https://github.com/ethereum/solidity/issues/3876 is implemented. */

    function swapOneForOne(address[2] memory tokenGiveGet, uint[2] memory nftGiveGet, address caller, ExchangeCore.Call memory call, address counterparty, ExchangeCore.Call memory countercall, address, uint, uint, uint)
        internal
        pure
    {

        /* Assert call is correct. */
        require(call.target == tokenGiveGet[0]);
        require(call.howToCall == AuthenticatedProxy.HowToCall.Call);
        require(ArrayUtils.arrayEq(call.data, abi.encodeWithSignature("transfer(address,uint256)", counterparty, nftGiveGet[0])));

        /* Assert counter-call is correct. */
        require(countercall.target == tokenGiveGet[1]);
        require(countercall.howToCall == AuthenticatedProxy.HowToCall.Call);
        require(ArrayUtils.arrayEq(countercall.data, abi.encodeWithSignature("transfer(address,uint256)", caller, nftGiveGet[1])));

    }

}
