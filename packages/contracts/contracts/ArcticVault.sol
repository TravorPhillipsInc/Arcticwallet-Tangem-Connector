// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ArcticVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error OnlyOperator();
    error ZeroAddress();
    error TokenNotAllowed();
    error RecipientNotAllowed();
    error InvalidAmount();
    error PerTransactionLimitExceeded();
    error DailyLimitExceeded();
    error RequestAlreadyProcessed();

    address public operator;
    uint256 public perTransactionLimit;
    uint256 public dailyLimit;
    uint256 public spentToday;
    uint64 public currentDay;

    mapping(address token => bool allowed) public allowedTokens;
    mapping(address recipient => bool allowed) public allowedRecipients;
    mapping(bytes32 requestId => bool processed) public processedRequests;

    event OperatorChanged(address indexed previousOperator, address indexed newOperator);
    event LimitsChanged(uint256 perTransactionLimit, uint256 dailyLimit);
    event TokenPermissionChanged(address indexed token, bool allowed);
    event RecipientPermissionChanged(address indexed recipient, bool allowed);
    event Withdrawal(
        bytes32 indexed requestId,
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    constructor(
        address owner_,
        address operator_,
        uint256 perTransactionLimit_,
        uint256 dailyLimit_
    ) Ownable(owner_) {
        if (owner_ == address(0) || operator_ == address(0)) revert ZeroAddress();
        operator = operator_;
        _setLimits(perTransactionLimit_, dailyLimit_);
        currentDay = uint64(block.timestamp / 1 days);
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert OnlyOperator();
        _;
    }

    function withdraw(
        address token,
        address recipient,
        uint256 amount,
        bytes32 requestId
    ) external onlyOperator whenNotPaused nonReentrant {
        if (!allowedTokens[token]) revert TokenNotAllowed();
        if (!allowedRecipients[recipient]) revert RecipientNotAllowed();
        if (amount == 0) revert InvalidAmount();
        if (amount > perTransactionLimit) revert PerTransactionLimitExceeded();
        if (processedRequests[requestId]) revert RequestAlreadyProcessed();

        uint64 day = uint64(block.timestamp / 1 days);
        if (day != currentDay) {
            currentDay = day;
            spentToday = 0;
        }
        if (spentToday + amount > dailyLimit) revert DailyLimitExceeded();

        processedRequests[requestId] = true;
        spentToday += amount;
        IERC20(token).safeTransfer(recipient, amount);
        emit Withdrawal(requestId, token, recipient, amount);
    }

    function ownerWithdraw(address token, address recipient, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        if (recipient == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(recipient, amount);
    }

    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert ZeroAddress();
        emit OperatorChanged(operator, newOperator);
        operator = newOperator;
    }

    function setLimits(uint256 perTransactionLimit_, uint256 dailyLimit_) external onlyOwner {
        _setLimits(perTransactionLimit_, dailyLimit_);
    }

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        allowedTokens[token] = allowed;
        emit TokenPermissionChanged(token, allowed);
    }

    function setRecipientAllowed(address recipient, bool allowed) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        allowedRecipients[recipient] = allowed;
        emit RecipientPermissionChanged(recipient, allowed);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _setLimits(uint256 perTransactionLimit_, uint256 dailyLimit_) internal {
        if (perTransactionLimit_ == 0 || dailyLimit_ < perTransactionLimit_) {
            revert InvalidAmount();
        }
        perTransactionLimit = perTransactionLimit_;
        dailyLimit = dailyLimit_;
        emit LimitsChanged(perTransactionLimit_, dailyLimit_);
    }
}
