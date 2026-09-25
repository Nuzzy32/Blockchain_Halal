// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title  CattleRegistry — HalalChain Trace v1.0
/// @notice Ketertelusuran daging sapi dua tingkat: sapi (cattleId) dan kemasan (packageId).
///         Spesifikasi lengkap: docs/CONTRACTS.md dan docs/DATA-MODEL.md.
contract CattleRegistry {
    // ---------------------------------------------------------------- Peran

    bytes32 public constant ADMIN_ROLE       = keccak256("ADMIN_ROLE");
    bytes32 public constant FARMER_ROLE      = keccak256("FARMER_ROLE");
    bytes32 public constant ABATTOIR_ROLE    = keccak256("ABATTOIR_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // ---------------------------------------------------------------- Enum
    // Nilai 0 = Unspecified supaya input yang lupa diisi tertolak, bukan diam-diam jadi opsi pertama.

    enum Grade { Unspecified, Standard, Choice, Prime }
    enum FeedType { Unspecified, GrassFed, GrainFed, Mixed, Organic }
    enum SlaughterMethod { Unspecified, ManualNoStunning, ManualWithStunning }
    enum CattleStatus { Registered, Slaughtered, Packaged }
    enum PackageStatus { Created, Shipped }
    enum CutType { Unspecified, Sirloin, Tenderloin, Ribeye, Brisket, Shank, Ground, Other }

    // ---------------------------------------------------------------- Struct
    // Urutan field disusun supaya muat sesedikit mungkin slot 32 byte.

    struct CattleRecord {
        // slot 1 (21 byte)
        uint64  cattleId;
        uint16  ageInMonths;
        uint16  liveWeightKg;
        uint8   grade;           // Grade
        uint8   feedType;        // FeedType
        uint8   status;          // CattleStatus
        uint8   slaughterMethod; // SlaughterMethod
        uint32  packagedGrams;   // total berat seluruh kemasan dari sapi ini
        bool    exists;
        // slot 2
        address farmer;
        uint64  registeredAt;
        // slot 3
        address abattoir;
        uint64  slaughteredAt;
        // slot 4-6
        bytes32 farmId;          // kode peternakan, bukan nama orang
        bytes32 slaughtermanId;  // ID sertifikat juru sembelih
        bytes32 halalCertNo;     // nomor sertifikat halal
    }

    struct PackageRecord {
        // slot 1 (31 byte)
        uint64  packageId;
        uint64  cattleId;        // menunjuk ke sapi induk
        uint32  weightGrams;
        uint8   cutType;         // CutType
        uint8   status;          // PackageStatus
        bool    exists;
        uint64  packagedAt;
        // slot 2
        uint64  shippedAt;
        address distributor;
    }

    // ---------------------------------------------------------------- Batas validasi (DATA-MODEL §5)

    uint16 private constant MIN_AGE_MONTHS     = 6;
    uint16 private constant MAX_AGE_MONTHS     = 120;
    uint16 private constant MIN_LIVE_WEIGHT_KG = 100;
    uint16 private constant MAX_LIVE_WEIGHT_KG = 1500;
    uint32 private constant MIN_PACKAGE_GRAMS  = 100;
    uint32 private constant MAX_PACKAGE_GRAMS  = 50_000;

    /// @notice Batas item per transaksi batch, supaya tidak melewati batas gas per blok (SECURITY A7).
    ///         Public supaya frontend membaca batas yang sama dari contract.
    uint256 public constant MAX_BATCH = 50;

    // ---------------------------------------------------------------- Penyimpanan

    mapping(uint64 => CattleRecord)  private cattleRecords;
    mapping(uint64 => PackageRecord) private packageRecords;
    mapping(uint64 => uint64[])      private cattleToPackages;

    uint64 private nextCattleId  = 1;
    uint64 private nextPackageId = 1;

    // private: frontend membaca lewat checkRole, satu jalur baca saja.
    mapping(address => mapping(bytes32 => bool)) private hasRole;
    uint256 private adminCount;

    // ---------------------------------------------------------------- Error

    error Unauthorized(address caller, bytes32 requiredRole);
    error CattleNotFound(uint64 cattleId);
    error PackageNotFound(uint64 packageId);
    error InvalidCattleStatus(uint64 cattleId, uint8 current, uint8 expected);
    error InvalidPackageStatus(uint64 packageId, uint8 current, uint8 expected);
    error InvalidAge(uint16 given);
    error InvalidWeight(uint32 given);
    error InvalidTimestamp(uint64 given);
    error EmptyField(string field);
    error UnspecifiedEnum(string field);
    error BatchTooLarge(uint256 given, uint256 max);
    error ZeroAddress();
    error LastAdmin();
    error LengthMismatch(uint256 cutTypes, uint256 weights);
    error WrongAbattoir(uint64 cattleId, address abattoir);
    error PackageWeightExceeded(uint64 cattleId, uint256 totalGrams, uint256 maxGrams);

    // ---------------------------------------------------------------- Event

    event CattleRegistered(uint64 indexed cattleId, address indexed farmer, bytes32 farmId, uint64 timestamp);
    event CattleSlaughtered(uint64 indexed cattleId, address indexed abattoir, bytes32 halalCertNo, uint64 slaughteredAt);
    event PackageCreated(uint64 indexed packageId, uint64 indexed cattleId, uint8 cutType, uint32 weightGrams);
    event PackageShipped(uint64 indexed packageId, address indexed distributor, uint64 shippedAt);
    event RoleGranted(address indexed account, bytes32 indexed role);
    event RoleRevoked(address indexed account, bytes32 indexed role);

    // ---------------------------------------------------------------- Manajemen peran

    constructor() {
        _grant(msg.sender, ADMIN_ROLE);
    }

    modifier onlyRole(bytes32 role) {
        if (!hasRole[msg.sender][role]) revert Unauthorized(msg.sender, role);
        _;
    }

    function grantRole(address account, bytes32 role) external onlyRole(ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _grant(account, role);
    }

    /// @dev Menolak mencabut admin terakhir: tanpa admin, peran tidak bisa diberikan lagi
    ///      dan contract terkunci selamanya (SECURITY A4).
    function revokeRole(address account, bytes32 role) external onlyRole(ADMIN_ROLE) {
        if (!hasRole[account][role]) return;
        if (role == ADMIN_ROLE) {
            if (adminCount == 1) revert LastAdmin();
            adminCount--;
        }
        hasRole[account][role] = false;
        emit RoleRevoked(account, role);
    }

    function checkRole(address account, bytes32 role) external view returns (bool) {
        return hasRole[account][role];
    }

    /// @dev Idempoten: peran yang sudah dimiliki tidak dihitung dua kali, supaya adminCount akurat.
    function _grant(address account, bytes32 role) private {
        if (hasRole[account][role]) return;
        hasRole[account][role] = true;
        if (role == ADMIN_ROLE) adminCount++;
        emit RoleGranted(account, role);
    }

    // ---------------------------------------------------------------- Peternak

    modifier cattleExists(uint64 cattleId) {
        if (!cattleRecords[cattleId].exists) revert CattleNotFound(cattleId);
        _;
    }

    function registerCattle(
        uint16 ageInMonths,
        uint16 liveWeightKg,
        Grade grade,
        FeedType feedType,
        bytes32 farmId
    ) external onlyRole(FARMER_ROLE) returns (uint64 cattleId) {
        if (ageInMonths < MIN_AGE_MONTHS || ageInMonths > MAX_AGE_MONTHS) revert InvalidAge(ageInMonths);
        if (liveWeightKg < MIN_LIVE_WEIGHT_KG || liveWeightKg > MAX_LIVE_WEIGHT_KG) revert InvalidWeight(liveWeightKg);
        if (grade == Grade.Unspecified) revert UnspecifiedEnum("grade");
        if (feedType == FeedType.Unspecified) revert UnspecifiedEnum("feedType");
        if (farmId == bytes32(0)) revert EmptyField("farmId");

        // ID dibuat contract, bukan input pengguna, supaya tidak bisa bertabrakan atau diserobot (DATA-MODEL §6).
        cattleId = nextCattleId++;
        uint64 registeredAt = uint64(block.timestamp);

        CattleRecord storage c = cattleRecords[cattleId];
        c.cattleId = cattleId;
        c.ageInMonths = ageInMonths;
        c.liveWeightKg = liveWeightKg;
        c.grade = uint8(grade);
        c.feedType = uint8(feedType);
        c.status = uint8(CattleStatus.Registered);
        c.exists = true;
        c.farmer = msg.sender;
        c.registeredAt = registeredAt;
        c.farmId = farmId;

        emit CattleRegistered(cattleId, msg.sender, farmId, registeredAt);
    }

    // ---------------------------------------------------------------- RPH: penyembelihan

    /// @notice Hanya bisa sekali per sapi dan tidak ada fungsi untuk mengubahnya — disengaja,
    ///         karena data halal yang bisa diedit menghilangkan seluruh nilai sistem ini.
    function recordSlaughter(
        uint64 cattleId,
        uint64 slaughteredAt,
        bytes32 slaughtermanId,
        bytes32 halalCertNo,
        SlaughterMethod method
    ) external onlyRole(ABATTOIR_ROLE) cattleExists(cattleId) {
        CattleRecord storage c = cattleRecords[cattleId];
        if (c.status != uint8(CattleStatus.Registered)) {
            revert InvalidCattleStatus(cattleId, c.status, uint8(CattleStatus.Registered));
        }
        if (slaughteredAt > block.timestamp || slaughteredAt < c.registeredAt) revert InvalidTimestamp(slaughteredAt);
        if (slaughtermanId == bytes32(0)) revert EmptyField("slaughtermanId");
        if (halalCertNo == bytes32(0)) revert EmptyField("halalCertNo");
        if (method == SlaughterMethod.Unspecified) revert UnspecifiedEnum("method");

        c.status = uint8(CattleStatus.Slaughtered);
        c.abattoir = msg.sender;
        c.slaughteredAt = slaughteredAt;
        c.slaughtermanId = slaughtermanId;
        c.halalCertNo = halalCertNo;
        c.slaughterMethod = uint8(method);

        emit CattleSlaughtered(cattleId, msg.sender, halalCertNo, slaughteredAt);
    }

    // ---------------------------------------------------------------- RPH: pengemasan

    function createPackages(
        uint64 cattleId,
        CutType[] calldata cutTypes,
        uint32[] calldata weightsGrams
    ) external onlyRole(ABATTOIR_ROLE) cattleExists(cattleId) returns (uint64[] memory packageIds) {
        CattleRecord storage c = cattleRecords[cattleId];
        // Status yang sah: Slaughtered atau Packaged (kemasan tambahan). Satu-satunya yang ditolak: Registered.
        if (c.status == uint8(CattleStatus.Registered)) {
            revert InvalidCattleStatus(cattleId, c.status, uint8(CattleStatus.Slaughtered));
        }
        if (c.abattoir != msg.sender) revert WrongAbattoir(cattleId, c.abattoir);
        uint256 count = cutTypes.length;
        if (count == 0) revert EmptyField("cutTypes");
        if (count != weightsGrams.length) revert LengthMismatch(count, weightsGrams.length);
        if (count > MAX_BATCH) revert BatchTooLarge(count, MAX_BATCH);

        packageIds = new uint64[](count);

        for (uint256 i = 0; i < count; i++) {
            if (cutTypes[i] == CutType.Unspecified) revert UnspecifiedEnum("cutType");
            uint32 weight = weightsGrams[i];
            if (weight < MIN_PACKAGE_GRAMS || weight > MAX_PACKAGE_GRAMS) revert InvalidWeight(weight);

            uint64 packageId = nextPackageId++;
            PackageRecord storage p = packageRecords[packageId];
            p.packageId = packageId;
            p.cattleId = cattleId;
            p.weightGrams = weight;
            p.cutType = uint8(cutTypes[i]);
            p.status = uint8(PackageStatus.Created);
            p.exists = true;
            p.packagedAt = uint64(block.timestamp);

            cattleToPackages[cattleId].push(packageId);
            packageIds[i] = packageId;
            c.packagedGrams += weight;
            emit PackageCreated(packageId, cattleId, uint8(cutTypes[i]), weight);
        }

        // Batas longgar: berat karkas nyata sekitar 50-60% berat hidup, jadi pemakaian jujur tidak pernah tertolak.
        if (uint256(c.packagedGrams) > uint256(c.liveWeightKg) * 1000) {
            revert PackageWeightExceeded(cattleId, uint256(c.packagedGrams), uint256(c.liveWeightKg) * 1000);
        }

        c.status = uint8(CattleStatus.Packaged);
    }

    // ---------------------------------------------------------------- Distributor

    modifier packageExists(uint64 packageId) {
        if (!packageRecords[packageId].exists) revert PackageNotFound(packageId);
        _;
    }

    /// @notice Satu kemasan yang tidak valid membatalkan seluruh batch, supaya tidak ada pengiriman setengah tercatat.
    function recordShipping(uint64[] calldata packageIds, uint64 shippedAt) external onlyRole(DISTRIBUTOR_ROLE) {
        uint256 count = packageIds.length;
        if (count == 0) revert EmptyField("packageIds");
        if (count > MAX_BATCH) revert BatchTooLarge(count, MAX_BATCH);
        if (shippedAt > block.timestamp) revert InvalidTimestamp(shippedAt);

        for (uint256 i = 0; i < count; i++) {
            uint64 packageId = packageIds[i];
            PackageRecord storage p = packageRecords[packageId];
            if (!p.exists) revert PackageNotFound(packageId);
            if (p.status != uint8(PackageStatus.Created)) {
                revert InvalidPackageStatus(packageId, p.status, uint8(PackageStatus.Created));
            }
            if (shippedAt < p.packagedAt) revert InvalidTimestamp(shippedAt);

            p.status = uint8(PackageStatus.Shipped);
            p.shippedAt = shippedAt;
            p.distributor = msg.sender;
            emit PackageShipped(packageId, msg.sender, shippedAt);
        }
    }

    // ---------------------------------------------------------------- Baca publik (tanpa wallet)

    function getCattle(uint64 cattleId) external view cattleExists(cattleId) returns (CattleRecord memory) {
        return cattleRecords[cattleId];
    }

    function totalCattle() external view returns (uint64) {
        return nextCattleId - 1;
    }

    /// @notice Paginasi: satu sapi bisa menghasilkan ratusan kemasan, jadi daftar dibaca per halaman.
    ///         Sapi yang tidak ada atau belum punya kemasan mengembalikan daftar kosong dan total 0.
    function getPackagesByCattle(uint64 cattleId, uint256 offset, uint256 limit)
        external
        view
        returns (uint64[] memory ids, uint256 total)
    {
        uint64[] storage all = cattleToPackages[cattleId];
        total = all.length;
        if (offset >= total) return (new uint64[](0), total);

        // Dibandingkan dengan sisa, bukan offset + limit, supaya limit sangat besar tidak overflow.
        uint256 end = limit > total - offset ? total : offset + limit;
        ids = new uint64[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            ids[i - offset] = all[i];
        }
    }

    function totalPackages() external view returns (uint64) {
        return nextPackageId - 1;
    }

    /// @notice Dipanggil halaman konsumen saat QR dipindai: kemasan + sapi induknya dalam satu pembacaan.
    function getPackageTrace(uint64 packageId)
        external
        view
        packageExists(packageId)
        returns (PackageRecord memory pkg, CattleRecord memory cattle)
    {
        pkg = packageRecords[packageId];
        cattle = cattleRecords[pkg.cattleId];
    }
}
