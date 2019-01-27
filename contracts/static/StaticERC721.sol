/*

    StaticERC721 - static calls for ERC721 trades

*/

pragma solidity 0.5.1;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../lib/ArrayUtils.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticERC721 {

    function swapOneForOne(bytes memory extra,
        address[5] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        // Decode extradata
        (address[2] memory tokenGiveGet, uint[2] memory nftGiveGet) = abi.decode(extra, (address[2],uint[2]));

        // Call target = token to give
        require(addresses[1] == tokenGiveGet[0], "ERC721: call target must equal address of token to give");
        // Call type = call
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721: call must be a direct call");
        // Assert calldata
        require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("transferFrom(address,address,uint256)", addresses[0], addresses[2], nftGiveGet[0])));

        // Countercall target = token to get
        require(addresses[3] == tokenGiveGet[1], "ERC721: countercall target must equal address of token to get");
        // Countercall type = call
        require(howToCalls[1] == AuthenticatedProxy.HowToCall.Call, "ERC721: countercall must be a direct call");
        // Assert countercalldata
        require(ArrayUtils.arrayEq(counterdata, abi.encodeWithSignature("transferFrom(address,address,uint256)", addresses[2], addresses[0], nftGiveGet[1])));

        // Mark filled
        return 1;
    }

}
