/*
  << TestSmartContractWallet >>
*/

pragma solidity 0.7.5;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";

contract ExchangeInterface{
    function approveOrder_(address registry, address maker, address staticTarget, bytes4 staticSelector, bytes calldata staticExtradata, uint maximumFill, uint listingTime, uint expirationTime, uint salt, bool orderbookInclusionDesired)
    external{}
}
contract ProxyInterface{
    function registerProxy()
    external{}
}

/**
 * @title TestSmartContractWallet
 * @dev Test contract for Smart contract wallets, proxies some calls an EOA wallet would make to setup on wyvern.
 */
contract TestSmartContractWallet {

    event Deposit(address indexed _from, uint indexed _id, uint _value);

    constructor () public {
    }

    // Called by atomicMatch when this contract is taker for an order with eth value exchanged.
    receive() external payable {
        // Use more than 2300 gas to test gas limit for send and transfer
        emit Deposit(msg.sender, 0, msg.value);
        emit Deposit(msg.sender, 1, msg.value);
        emit Deposit(msg.sender, 2, msg.value);
    }

    // Proxy to exchange
    function approveOrder_(address exchange, address registry, address maker, address staticTarget, bytes4 staticSelector, bytes calldata staticExtradata, uint maximumFill, uint listingTime, uint expirationTime, uint salt, bool orderbookInclusionDesired)
    public returns (bool) {
        ExchangeInterface(exchange).approveOrder_(registry, maker, staticTarget, staticSelector, staticExtradata, maximumFill, listingTime, expirationTime, salt, orderbookInclusionDesired);
        return true;
    }

    // Proxy to registry
    function registerProxy(address registry)
    public returns (bool) {
        ProxyInterface(registry).registerProxy();
        return true;
    }

    // Proxy to erc721
    function setApprovalForAll(address registry, address erc721, bool approved)
    public returns (bool) {
        ERC721(erc721).setApprovalForAll(registry, approved);
        return true;
    }
}
