// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ArcticVault} from "./ArcticVault.sol";

contract ArcticVaultFactory {
    event VaultCreated(address indexed owner, address indexed vault, address indexed operator);

    mapping(address owner => address[] vaults) private _vaults;

    function createVault(
        address operator,
        uint256 perTransactionLimit,
        uint256 dailyLimit
    ) external returns (address vault) {
        vault = address(
            new ArcticVault(msg.sender, operator, perTransactionLimit, dailyLimit)
        );
        _vaults[msg.sender].push(vault);
        emit VaultCreated(msg.sender, vault, operator);
    }

    function vaultsOf(address owner) external view returns (address[] memory) {
        return _vaults[owner];
    }
}
