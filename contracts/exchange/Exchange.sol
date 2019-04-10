/*

  << Exchange >>

*/

pragma solidity 0.5.7;

import "./ExchangeCore.sol";

/**
 * @title Exchange
 * @author Wyvern Protocol Developers
 */
contract Exchange is ExchangeCore {

    /* Public ABI-encodable method wrappers. */

    function hashOrder_(address registry, address maker, address staticTarget, bytes4 staticSelector, bytes memory staticExtradata, uint maximumFill, uint listingTime, uint expirationTime, uint salt)
        public
        pure
        returns (bytes32 hash)
    {
        return hashOrder(Order(registry, maker, staticTarget, staticSelector, staticExtradata, maximumFill, listingTime, expirationTime, salt));
    }

    function hashToSign_(bytes32 orderHash)
        external
        view
        returns (bytes32 hash)
    {
        return hashToSign(orderHash);
    }

    function validateOrderParameters_(address registry, address maker, address staticTarget, bytes4 staticSelector, bytes memory staticExtradata, uint maximumFill, uint listingTime, uint expirationTime, uint salt)
        public
        view
        returns (bool)
    {
        Order memory order = Order(registry, maker, staticTarget, staticSelector, staticExtradata, maximumFill, listingTime, expirationTime, salt);
        return validateOrderParameters(order, hashOrder(order));
    }

    function validateOrderAuthorization_(bytes32 hash, address maker, uint8 v, bytes32 r, bytes32 s)
        external
        view
        returns (bool)
    {
        return validateOrderAuthorization(hash, maker, Sig(v, r, s));
    }

    function approveOrderHash_(bytes32 hash)
        external
    {
        return approveOrderHash(hash);
    }

    function approveOrder_(address registry, address maker, address staticTarget, bytes4 staticSelector, bytes memory staticExtradata, uint maximumFill, uint listingTime, uint expirationTime, uint salt, bool orderbookInclusionDesired)
        public
    {
        return approveOrder(Order(registry, maker, staticTarget, staticSelector, staticExtradata, maximumFill, listingTime, expirationTime, salt), orderbookInclusionDesired);
    }

    function setOrderFill_(bytes32 hash, uint fill)
        external
    {
        return setOrderFill(hash, fill);
    }

    function atomicMatch_(uint[16] memory uints, bytes4[2] memory staticSelectors,
        bytes memory firstExtradata, bytes memory firstCalldata, bytes memory secondExtradata, bytes memory secondCalldata,
        uint8[4] memory howToCallsVs, bytes32[5] memory rssMetadata)
        public
        payable
    {
        return atomicMatch(
            Order(address(uints[0]), address(uints[1]), address(uints[2]), staticSelectors[0], firstExtradata, uints[3], uints[4], uints[5], uints[6]),
            Sig(howToCallsVs[0], rssMetadata[0], rssMetadata[1]),
            Call(address(uints[7]), AuthenticatedProxy.HowToCall(howToCallsVs[1]), firstCalldata),
            Order(address(uints[8]), address(uints[9]), address(uints[10]), staticSelectors[1], secondExtradata, uints[11], uints[12], uints[13], uints[14]),
            Sig(howToCallsVs[2], rssMetadata[2], rssMetadata[3]),
            Call(address(uints[15]), AuthenticatedProxy.HowToCall(howToCallsVs[3]), secondCalldata),
            rssMetadata[4]
        );
    }

}
