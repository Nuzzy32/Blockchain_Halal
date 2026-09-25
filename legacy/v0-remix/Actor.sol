// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CattleTraceability.sol";

/// @notice Proxy aktor. Dibutuhkan karena semua pemanggilan langsung dari contract test
///         punya msg.sender yang sama (alamat contract test), jadi role tidak bisa dipisah.
///         Tiap Actor = satu alamat = satu peran.
/// @dev    Constructor sengaja tanpa argumen (pakai init() terpisah, bukan constructor
///         param) karena plugin Solidity Unit Testing Remix mencoba men-deploy SETIAP
///         contract di seluruh hasil compile (termasuk yang diimpor) dengan 0 argumen,
///         untuk memeriksa apakah itu test suite. Constructor berargumen bikin proses itu
///         gagal duluan dengan "incorrect number of arguments to constructor" sebelum
///         test yang sebenarnya sempat jalan.
contract Actor {
    CattleTraceability private ct;

    function init(CattleTraceability _ct) external {
        ct = _ct;
    }

    function assignRole(address who, CattleTraceability.Role r) external {
        ct.setRole(who, r);
    }

    function register(
        uint256 id,
        uint256 age,
        string calldata feedType,
        string calldata grade
    ) external {
        ct.registerCattle(id, age, feedType, grade);
    }

    function slaughter(uint256 id) external {
        ct.recordSlaughter(id);
    }

    function ship(uint256 id) external {
        ct.recordShipping(id);
    }
}
