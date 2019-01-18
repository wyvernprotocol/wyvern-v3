/*

    StaticERC721 - static calls for ERC721 trades

*/

pragma solidity 0.5.1;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../lib/ArrayUtils.sol";
import "../registry/AuthenticatedProxy.sol";

contract StaticERC721 {

    function swapOneForOne(address[2] memory tokenGiveGet, uint[2] memory nftGiveGet,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        // Call target = token to give
        require(addresses[2] == tokenGiveGet[0], "ERC721: call target must equal address of token to give");
        // Call type = call
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721: call must be a direct call");
        // Decode call data
        (address transferDest, uint transferNft) = abi.decode(data, (address, uint));
        // Transfer dest = counterparty
        require(transferDest == addresses[4], "ERC721: transfer destination must be counterparty");
        // Transfer NFTt = give NFT
        require(transferNft == nftGiveGet[0], "ERC721: transfer token ID must equal ID of token to give");

        // Countercall target = token to get
        require(addresses[5] == tokenGiveGet[1], "ERC721: countercall target must equal address of token to get");
        // Countercall type = call
        require(howToCalls[1] == AuthenticatedProxy.HowToCall.Call, "ERC721: countercall must be a direct call");
        // Decode countercall data
        (address counterTransferDest, uint counterTransferNft) = abi.decode(counterdata, (address, uint));
        // Countertransfer dest = us
        require(counterTransferDest == addresses[1], "ERC721: counter transfer destination must be us");
        // Countertransfer NFT = get NFT
        require(counterTransferNft == nftGiveGet[1], "ERC721: counter transfer token ID must equal ID of token to get");

        // Mark filled
        return 1;
    }

}
