/*

    StaticERC721 - static calls for ERC721 trades

*/

pragma solidity 0.5.0;

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
        require(addresses[2] == tokenGiveGet[0]);
        // Call type = call
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call);
        // Decode call data
        (address transferDest, uint transferNft) = abi.decode(data, (address, uint));
        // Transfer dest = counterparty
        require(transferDest == addresses[4]);
        // Transfer NFTt = give NFT
        require(transferNft == nftGiveGet[0]);

        // Countercall target = token to get
        require(addresses[5] == tokenGiveGet[1]);
        // Countercall type = call
        require(howToCalls[1] == AuthenticatedProxy.HowToCall.Call);
        // Decode countercall data
        (address counterTransferDest, uint counterTransferNft) = abi.decode(counterdata, (address, uint));
        // Countertransfer dest = us
        require(counterTransferDest == addresses[1]);
        // Countertransfer NFT = get NFT
        require(counterTransferNft == nftGiveGet[1]);

        // Mark filled
        return 1;
    }

}
