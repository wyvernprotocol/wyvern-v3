pragma solidity >= 0.4.9;

import "./ExchangeCore.sol";

contract Exchange is ExchangeCore {

    /* Public ABI-encodable method wrappers. */

    function hashOrder_(address exchange, address maker, address staticTarget, bytes memory staticExtradata, uint maximumFill, uint listingTime, uint expirationTime, uint salt)
        public
        pure
        returns (bytes32 hash)
    {
        return hashOrder(Order(exchange, maker, staticTarget, staticExtradata, maximumFill, listingTime, expirationTime, salt));
    }

    function hashToSign_(bytes32 orderHash)
        public
        pure
        returns (bytes32 hash)
    {
        return hashToSign(orderHash);
    }

    function validateOrderParameters_(address exchange, address maker, address staticTarget, bytes memory staticExtradata, uint maximumFill, uint listingTime, uint expirationTime, uint salt)
        public
        view
        returns (bool)
    {
        return validateOrderParameters(Order(exchange, maker, staticTarget, staticExtradata, maximumFill, listingTime, expirationTime, salt));
    }

    function validateOrderAuthorization_(bytes32 hash, address maker, uint maximumFill, uint8 v, bytes32 r, bytes32 s)
        public
        view
        returns (bool)
    {
        return validateOrderAuthorization(hash, maker, maximumFill, Sig(v, r, s));
    }

    function approveOrder_(address exchange, address maker, address staticTarget, bytes memory staticExtradata, uint maximumFill, uint listingTime, uint expirationTime, uint salt, bool orderbookInclusionDesired)
        public
    {
        return approveOrder(Order(exchange, maker, staticTarget, staticExtradata, maximumFill, listingTime, expirationTime, salt), orderbookInclusionDesired);
    }

    function setOrderFill_(bytes32 hash, uint fill)
        public
    {
        return setOrderFill(hash, fill);
    }

    function atomicMatch_(address[8] memory addrs, uint[8] memory uints, bytes memory firstExtradata, bytes memory firstCalldata, bytes memory secondExtradata,
        bytes memory secondCalldata, uint8[4] memory howToCallsVs, bytes32[5] memory rssMetadata)
        public
        payable
    {
        return atomicMatch(
            Order(addrs[0], addrs[1], addrs[2], firstExtradata, uints[0], uints[1], uints[2], uints[3]),
            Sig(howToCallsVs[0], rssMetadata[0], rssMetadata[1]),
            Call(addrs[3], AuthenticatedProxy.HowToCall(howToCallsVs[1]), firstCalldata),
            Order(addrs[4], addrs[5], addrs[6], secondExtradata, uints[4], uints[5], uints[6], uints[7]),
            Sig(howToCallsVs[2], rssMetadata[2], rssMetadata[3]),
            Call(addrs[7], AuthenticatedProxy.HowToCall(howToCallsVs[3]), secondCalldata),
            rssMetadata[4]
        );
    }

}
