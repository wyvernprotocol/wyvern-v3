/*

    ExchangeCore

*/

pragma solidity >= 0.4.9;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "../lib/ArrayUtils.sol";
import "../lib/StaticCaller.sol";
import "../lib/ReentrancyGuarded.sol";
import "../registry/ProxyRegistry.sol";
import "../registry/AuthenticatedProxy.sol";

/**
 * @title ExchangeCore
 * @author Wyvern Protocol Developers
 */
contract ExchangeCore is ReentrancyGuarded, StaticCaller {

    /* Registry. */
    ProxyRegistry public registry;

    /* Cancelled / finalized orders, by hash. */
    mapping(bytes32 => bool) public cancelledOrFinalized;

    /* Orders verified by on-chain approval (alternative to ECDSA signatures so that smart contracts can place orders directly). */
    mapping(bytes32 => bool) public approvedOrders;

    /* A signature, convenience struct. */
    struct Sig {
        /* v parameter */
        uint8 v;
        /* r parameter */
        bytes32 r;
        /* s parameter */
        bytes32 s;
    }

    /* An order, convenience struct. */
    struct Order {
        /* Exchange contract address (versioning mechanism). */
        address exchange;
        /* Order maker address. */
        address maker;
        /* Order static target. */
        address staticTarget;
        /* Order static extradata. */
        bytes staticExtradata;
        /* Order listing timestamp. */
        uint listingTime;
        /* Order expiration timestamp - 0 for no expiry. */
        uint expirationTime;
        /* Order salt to prevent duplicate hashes. */
        uint salt;
    }

    /* A call, convenience struct. */
    struct Call {
        /* Target */
        address target;
        /* How to call */
        AuthenticatedProxy.HowToCall howToCall;
        /* Calldata */
        bytes data;
    }

    /* Order match metadata, convenience struct. */
    struct Metadata {
        /* Matcher */
        address matcher;
        /* Value */
        uint value;
        /* Listing time */
        uint listingTime;
        /* Expiration time */
        uint expirationTime;
    }

    /* Events */
    event OrderApproved   (bytes32 indexed hash, address indexed maker, address staticTarget, bytes staticExtradata, uint listingTime, uint expirationTime, uint salt, bool orderbookInclusionDesired);
    event OrderCancelled  (bytes32 indexed hash, address indexed maker);
    event OrdersMatched   (bytes32 firstHash, bytes32 secondHash, address indexed firstMaker, address indexed secondMaker, bytes32 indexed metadata);

    function hashOrder(Order memory order)
        internal
        pure
        returns (bytes32 hash)
    {
        /* Hash all fields in the order. */
        return keccak256(abi.encodePacked(order.exchange, order.maker, order.staticTarget, order.staticExtradata, order.listingTime, order.expirationTime, order.salt));
    }

    function hashToSign(bytes32 orderHash)
        internal
        pure
        returns (bytes32 hash)
    {
        /* Calculate the string a user must sign. */
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", orderHash));
    }

    function exists(address what)
        internal
        view
        returns (bool)
    {
        uint size;
        assembly {
            size := extcodesize(what)
        }
        return size > 0;
    }

    function validateOrderParameters(Order memory order)
        internal
        view
        returns (bool)
    {
        /* Order must be targeted at this protocol version (this exchange contract). */
        if (order.exchange != address(this)) {
            return false;
        }

        /* Order must be listed and not be expired. */
        if (order.listingTime > block.timestamp || order.expirationTime <= block.timestamp) {
            return false;
        }

        /* Order static target must exist. */
        if (!exists(order.staticTarget)) {
            return false;
        }

        return true;
    }

    function validateOrderAuthorization(bytes32 hash, address maker, Sig memory sig)
        internal
        view
        returns (bool)
    {
        /* Order must not have been cancelled or already filled. */
        if (cancelledOrFinalized[hash]) {
            return false;
        }

        /* Order authentication. Order must be either: */

        /* (a): sent by maker */
        if (maker == msg.sender) {
            return true;
        }

        /* (b): previously approved */
        if (approvedOrders[hash]) {
            return true;
        }
    
        /* (c): ECDSA-signed by maker. */
        if (ecrecover(hashToSign(hash), sig.v, sig.r, sig.s) == maker) {
            return true;
        }

        return false;
    }

    function encodeCallerAndCall(address caller, Call memory call)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(caller, call.target, call.howToCall, call.data);
    }

    function encodeStaticCall(Order memory order, Call memory call, Order memory counterorder, Call memory countercall, address matcher, uint value)
        internal
        pure
        returns (bytes memory)
    {
        /* This nonsense is necessary to preserve static call target function stack space. */
        address[5] memory addresses = [order.maker, call.target, counterorder.maker, countercall.target, matcher];
        AuthenticatedProxy.HowToCall[2] memory howToCalls = [call.howToCall, countercall.howToCall];
        uint[4] memory uints = [value, order.listingTime, order.expirationTime, counterorder.listingTime];
        return abi.encodePacked(order.staticExtradata, abi.encode(addresses, howToCalls, uints, call.data, countercall.data));
    }

    function executeStaticCall(Order memory order, Call memory call, Order memory counterorder, Call memory countercall, address matcher, uint value)
        internal
        view
        returns (bool)
    {
        return staticCall(order.staticTarget, encodeStaticCall(order, call, counterorder, countercall, matcher, value));
    }

    function executeCall(address maker, Call memory call)
        internal
        returns (bool)
    {
        /* Assert target exists. */
        require(exists(call.target));

        /* Retrieve delegate proxy contract. */
        OwnableDelegateProxy delegateProxy = registry.proxies(maker);

        /* Assert existence. */
        require(delegateProxy != OwnableDelegateProxy(0));

        /* Assert implementation. */
        require(delegateProxy.implementation() == registry.delegateProxyImplementation());
      
        /* Typecast. */
        AuthenticatedProxy proxy = AuthenticatedProxy(address(delegateProxy));
  
        /* Execute order. */
        return proxy.proxy(call.target, call.howToCall, call.data);
    }

    function approveOrder(Order memory order, bool orderbookInclusionDesired)
        internal
    {
        /* CHECKS */

        /* Assert sender is authorized to approve order. */
        require(order.maker == msg.sender);

        /* Calculate order hash. */
        bytes32 hash = hashOrder(order);

        /* Assert order has not already been approved. */
        require(!approvedOrders[hash]);

        /* EFFECTS */

        /* Mark order as approved. */
        approvedOrders[hash] = true;

        /* Log approval event. */
        emit OrderApproved(hash, order.maker, order.staticTarget, order.staticExtradata, order.listingTime, order.expirationTime, order.salt, orderbookInclusionDesired);
    }

    function cancelOrder(Order memory order)
        internal
    {
        /* CHECKS */

        /* Assert sender is authorized to cancel order. */
        require(order.maker == msg.sender);

        /* Calculate order hash. */
        bytes32 hash = hashOrder(order);

        /* Assert order has not already been cancelled or finalized. */
        require(!cancelledOrFinalized[hash]);

        /* EFFECTS */

        /* Mark order as cancelled. */
        cancelledOrFinalized[hash] = true;

        /* Log cancellation event. */
        emit OrderCancelled(hash, order.maker);
    }

    function atomicMatch(Order memory firstOrder, Sig memory firstSig, Call memory firstCall, Order memory secondOrder, Sig memory secondSig, Call memory secondCall, bytes32 metadata)
        internal
        reentrancyGuard
    {
        /* CHECKS */

        /* Calculate first order hash. */
        bytes32 firstHash = hashOrder(firstOrder);

        /* Check first order validity. */
        require(validateOrderParameters(firstOrder));

        /* Check first order authorization. */
        require(validateOrderAuthorization(firstHash, firstOrder.maker, firstSig));

        /* Calculate second order hash. */
        bytes32 secondHash = hashOrder(secondOrder);

        /* Check second order validity. */
        require(validateOrderParameters(secondOrder));

        /* Check second order authorization. */
        require(validateOrderAuthorization(secondHash, secondOrder.maker, secondSig));

        /* Prevent self-matching (possibly unnecessary, but safer). */
        require(firstHash != secondHash);

        /* EFFECTS */ 
  
        /* Mark first order as finalized. */
        if (firstOrder.maker != msg.sender) {
            cancelledOrFinalized[firstHash] = true;
        }

        /* Mark second order as finalized. */
        if (secondOrder.maker != msg.sender) {
            cancelledOrFinalized[secondHash] = true;
        }
        
        /* INTERACTIONS */

        /* Transfer any msg.value.
           This is the first "asymmetric" part of order matching: if an order requires Ether, it must be the first order. */
        if (msg.value > 0) {
            address(uint160(firstOrder.maker)).transfer(msg.value);
        }

        /* Execute first call, assert success.
           This is the second "asymmetric" part of order matching: execution of the second order can depend on state changes in the first order, but not vice-versa. */
        assert(executeCall(firstOrder.maker, firstCall));

        /* Execute second call, assert success. */
        assert(executeCall(secondOrder.maker, secondCall));

        /* Static calls must happen after the effectful calls so that they can check the resulting state. */

        /* Execute first order static call, assert success. */
        assert(executeStaticCall(firstOrder, firstCall, secondOrder, secondCall, msg.sender, msg.value));
      
        /* Execute second order static call, assert success. */
        assert(executeStaticCall(secondOrder, secondCall, firstOrder, firstCall, msg.sender, uint(0)));

        /* Log match event. */
        emit OrdersMatched(firstHash, secondHash, firstOrder.maker, secondOrder.maker, metadata);
    }

}
