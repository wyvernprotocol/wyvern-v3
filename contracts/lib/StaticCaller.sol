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
        returns (uint ret)
    {
        assembly {
            let size := 0x20
            let result := staticcall(gas, target, add(data, 0x20), mload(data), ret, size)
            switch result
            case 0 { revert(ret, size) }
            default { return(ret, size) } 
        }
    }

}
