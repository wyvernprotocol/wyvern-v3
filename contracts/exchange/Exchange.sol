pragma solidity 0.4.24;

import "./ExchangeCore.sol";

contract Exchange is ExchangeCore {

  /* Public ABI-encodable method wrappers. */

  function hashOrder_(address exchange, address maker, address staticTarget, bytes staticExtradata, uint listingTime, uint expirationTime, uint salt)
      public
      pure
      returns (bytes32 hash)
  {
      return hashOrder(Order(exchange, maker, staticTarget, staticExtradata, listingTime, expirationTime, salt));
  }

  // TODO Add the rest.

}
