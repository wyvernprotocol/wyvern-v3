pragma solidity >= 0.4.9;

contract StaticCaller {

    struct StaticSpec {
        /* target */
        address target;
        /* extradata */
        bytes extradata;
    }

    function staticCall(address target, bytes memory data)
        internal
        view
        returns (bool result)
    {
        assembly {
            result := staticcall(gas, target, add(data, 0x20), mload(data), mload(0x40), 0)
        }
        return result;
    }

    function staticCallUint(address target, bytes memory data)
        internal
        view
        returns (uint)
    {
        assembly {
            let ptr := mload(0x40)
            let result := staticcall(gas, target, add(data, 0x20), mload(data), 0, 0)
            let size := returndatasize
            returndatacopy(ptr, 0, size)

            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }

}
