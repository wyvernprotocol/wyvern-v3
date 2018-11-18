pragma solidity >= 0.4.9;

contract StaticCaller {

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
        bool result;
        assembly {
            let size := 0x20
            result := staticcall(gas, target, add(data, 0x20), mload(data), ret, size)
        }
        require(result);
        return ret;
    }

}
