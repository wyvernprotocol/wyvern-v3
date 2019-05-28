/**

  << TestAuthenticatedProxy >>

  Just for DelegateCall testing.

**/

pragma solidity 0.5.9;

import "./registry/AuthenticatedProxy.sol";

contract TestAuthenticatedProxy is AuthenticatedProxy {

    function setUser(address newUser)
        public
    {
        registry.transferAccessTo(user, newUser);
        user = newUser;
    }

}
