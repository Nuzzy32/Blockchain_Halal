// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  CattleTraceability
/// @notice Pencatatan rantai pasok daging sapi: peternakan -> rumah potong -> distributor.
///         Setiap tahap hanya boleh dicatat oleh wallet dengan role yang sesuai, dan hanya
///         boleh dicatat satu kali serta harus berurutan.
/// @dev    Tanggal sembelih & kirim diambil dari block.timestamp, bukan input pengguna.
///         Tanggal yang diisi manual bisa dibohongi, dan itu menghilangkan inti nilai
///         pencatatan on-chain.
contract CattleTraceability {
    enum Role {
        None,        // 0
        Farmer,      // 1 - peternak
        Butcher,     // 2 - rumah potong
        Distributor  // 3 - distributor / supermarket
    }

    struct CattleRecord {
        uint256 id;
        uint256 age;             // umur dalam bulan
        string  feedType;        // jenis pakan
        string  grade;           // grade sapi
        uint256 registeredDate;  // 0 = belum terdaftar
        uint256 slaughterDate;   // 0 = belum disembelih
        uint256 shippedDate;     // 0 = belum dikirim
        address farmer;
        address butcher;
        address distributor;
    }

    address public owner;

    mapping(address => Role) public roles;

    // private + diakses lewat getRecord() supaya bisa ada guard "data tidak ditemukan".
    // Frontend perlu membedakan QR tidak valid dari data kosong.
    mapping(uint256 => CattleRecord) private records;

    event RoleAssigned(address indexed who, Role role);
    event CattleRegistered(uint256 indexed id, address indexed by, uint256 at);
    event SlaughterRecorded(uint256 indexed id, address indexed by, uint256 at);
    event ShippingRecorded(uint256 indexed id, address indexed by, uint256 at);

    modifier onlyRole(Role r) {
        require(roles[msg.sender] == r, "CT: role tidak berwenang");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Owner menetapkan role untuk sebuah wallet. Set ke Role.None untuk mencabut.
    function setRole(address who, Role r) external {
        require(msg.sender == owner, "CT: hanya owner");
        require(who != address(0), "CT: alamat kosong");

        roles[who] = r;
        emit RoleAssigned(who, r);
    }

    /// @notice Peternak mendaftarkan sapi baru.
    function registerCattle(
        uint256 id,
        uint256 age,
        string calldata feedType,
        string calldata grade
    ) external onlyRole(Role.Farmer) {
        require(id != 0, "CT: id tidak boleh 0"); // id 0 dipakai sebagai sentinel "tidak ada"
        require(records[id].registeredDate == 0, "CT: sapi sudah terdaftar");
        require(age > 0, "CT: umur tidak boleh 0");
        require(bytes(feedType).length > 0, "CT: jenis pakan kosong");
        require(bytes(grade).length > 0, "CT: grade kosong");

        CattleRecord storage rec = records[id];
        rec.id = id;
        rec.age = age;
        rec.feedType = feedType;
        rec.grade = grade;
        rec.registeredDate = block.timestamp;
        rec.farmer = msg.sender;

        emit CattleRegistered(id, msg.sender, block.timestamp);
    }

    /// @notice Rumah potong mencatat penyembelihan.
    function recordSlaughter(uint256 id) external onlyRole(Role.Butcher) {
        CattleRecord storage rec = records[id];
        require(rec.registeredDate != 0, "CT: sapi belum terdaftar");
        require(rec.slaughterDate == 0, "CT: sapi sudah disembelih");

        rec.slaughterDate = block.timestamp;
        rec.butcher = msg.sender;

        emit SlaughterRecorded(id, msg.sender, block.timestamp);
    }

    /// @notice Distributor mencatat pengiriman.
    /// @dev    Tidak perlu cek registeredDate: slaughterDate != 0 sudah menjamin terdaftar.
    function recordShipping(uint256 id) external onlyRole(Role.Distributor) {
        CattleRecord storage rec = records[id];
        require(rec.slaughterDate != 0, "CT: sapi belum disembelih");
        require(rec.shippedDate == 0, "CT: sapi sudah dikirim");

        rec.shippedDate = block.timestamp;
        rec.distributor = msg.sender;

        emit ShippingRecorded(id, msg.sender, block.timestamp);
    }

    /// @notice Baca riwayat sapi. View, gratis, tanpa wallet - dipanggil saat konsumen scan QR.
    function getRecord(uint256 id) external view returns (CattleRecord memory) {
        require(records[id].registeredDate != 0, "CT: data tidak ditemukan");
        return records[id];
    }
}
