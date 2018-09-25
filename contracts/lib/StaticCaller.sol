pragma solidity 0.4.24;

contract StaticCaller {

    struct StaticSpec {
        /* target */
        address target;
        /* extradata */
        bytes extradata;
    }

    function staticCall(address target, bytes memory calldata)
        internal
        view
        returns (bool result)
    {
        assembly {
            result := staticcall(gas, target, add(calldata, 0x20), mload(calldata), mload(0x40), 0)
        }
        return result;
    }

}
