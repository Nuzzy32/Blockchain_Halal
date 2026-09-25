// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "remix_tests.sol";
import "./CattleTraceability.sol";
import "./Actor.sol";

/// @notice Jalankan dari tab "Solidity Unit Testing" di Remix.
///         Urutan fungsi test = urutan eksekusi. ID sapi dipisah per test supaya
///         test tidak saling mengunci, kecuali yang memang sengaja memakai ID yang sama.
contract CattleTraceabilityTest {
    CattleTraceability ct;
    Actor farmer;
    Actor butcher;
    Actor distributor;
    Actor outsider; // tanpa role

    function beforeAll() public {
        ct = new CattleTraceability(); // contract test ini jadi owner
        farmer = new Actor(); farmer.init(ct);
        butcher = new Actor(); butcher.init(ct);
        distributor = new Actor(); distributor.init(ct);
        outsider = new Actor(); outsider.init(ct);

        ct.setRole(address(farmer), CattleTraceability.Role.Farmer);
        ct.setRole(address(butcher), CattleTraceability.Role.Butcher);
        ct.setRole(address(distributor), CattleTraceability.Role.Distributor);
    }

    /// 0. Setup benar
    function ownerDanRoleTerpasangBenar() public {
        Assert.equal(ct.owner(), address(this), "owner harus contract test");
        Assert.equal(
            uint256(ct.roles(address(farmer))),
            uint256(CattleTraceability.Role.Farmer),
            "role peternak tidak terpasang"
        );
        Assert.equal(
            uint256(ct.roles(address(outsider))),
            uint256(CattleTraceability.Role.None),
            "outsider seharusnya tanpa role"
        );
    }

    /// 1. setRole hanya boleh owner
    function setRoleHanyaBolehOwner() public {
        try outsider.assignRole(address(outsider), CattleTraceability.Role.Farmer) {
            Assert.ok(false, "setRole dari non-owner seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: hanya owner", "revert reason salah");
        }
    }

    /// 2. Happy path: register -> slaughter -> ship
    function alurPenuhBerhasil() public {
        farmer.register(1, 24, "Rumput & Konsentrat", "A");
        butcher.slaughter(1);
        distributor.ship(1);

        CattleTraceability.CattleRecord memory rec = ct.getRecord(1);

        Assert.equal(rec.id, uint256(1), "id salah");
        Assert.equal(rec.age, uint256(24), "umur salah");
        Assert.equal(rec.feedType, "Rumput & Konsentrat", "jenis pakan salah");
        Assert.equal(rec.grade, "A", "grade salah");

        Assert.equal(rec.farmer, address(farmer), "alamat peternak salah");
        Assert.equal(rec.butcher, address(butcher), "alamat rumah potong salah");
        Assert.equal(rec.distributor, address(distributor), "alamat distributor salah");

        Assert.ok(rec.registeredDate > 0, "tanggal registrasi kosong");
        Assert.ok(rec.slaughterDate >= rec.registeredDate, "tanggal sembelih mendahului registrasi");
        Assert.ok(rec.shippedDate >= rec.slaughterDate, "tanggal kirim mendahului sembelih");
    }

    /// 3. Role salah ditolak
    function roleSalahDitolak() public {
        try farmer.slaughter(1) {
            Assert.ok(false, "peternak seharusnya tidak boleh mencatat sembelih");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: role tidak berwenang", "revert reason salah");
        }

        try butcher.register(50, 20, "Silase", "B") {
            Assert.ok(false, "rumah potong seharusnya tidak boleh mendaftarkan sapi");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: role tidak berwenang", "revert reason salah");
        }
    }

    /// 4. Tahap harus berurutan
    function kirimSebelumSembelihDitolak() public {
        farmer.register(2, 30, "Rumput", "B");

        try distributor.ship(2) {
            Assert.ok(false, "pengiriman sebelum sembelih seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: sapi belum disembelih", "revert reason salah");
        }
    }

    /// 5. Tidak boleh daftar dua kali
    function registerDuplikatDitolak() public {
        try farmer.register(2, 30, "Rumput", "B") {
            Assert.ok(false, "id duplikat seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: sapi sudah terdaftar", "revert reason salah");
        }
    }

    /// 6. Tidak boleh catat tahap yang sama dua kali
    function pencatatanGandaDitolak() public {
        try butcher.slaughter(1) {
            Assert.ok(false, "sembelih dua kali seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: sapi sudah disembelih", "revert reason salah");
        }

        try distributor.ship(1) {
            Assert.ok(false, "kirim dua kali seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: sapi sudah dikirim", "revert reason salah");
        }
    }

    /// 7. Tidak boleh sembelih sapi yang belum terdaftar
    function sembelihSapiBelumTerdaftarDitolak() public {
        try butcher.slaughter(777) {
            Assert.ok(false, "sembelih sapi tak terdaftar seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: sapi belum terdaftar", "revert reason salah");
        }
    }

    /// 8. Validasi input
    function inputTidakValidDitolak() public {
        try farmer.register(0, 24, "Rumput", "A") {
            Assert.ok(false, "id 0 seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: id tidak boleh 0", "revert reason salah");
        }

        try farmer.register(3, 0, "Rumput", "A") {
            Assert.ok(false, "umur 0 seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: umur tidak boleh 0", "revert reason salah");
        }

        try farmer.register(3, 24, "", "A") {
            Assert.ok(false, "jenis pakan kosong seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: jenis pakan kosong", "revert reason salah");
        }

        try farmer.register(3, 24, "Rumput", "") {
            Assert.ok(false, "grade kosong seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: grade kosong", "revert reason salah");
        }
    }

    /// 9. getRecord untuk id yang tidak ada
    function getRecordIdTidakAdaDitolak() public {
        try ct.getRecord(999) returns (CattleTraceability.CattleRecord memory) {
            Assert.ok(false, "id tidak ada seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: data tidak ditemukan", "revert reason salah");
        }
    }

    /// 10. Role bisa dicabut
    function roleBisaDicabut() public {
        ct.setRole(address(farmer), CattleTraceability.Role.None);

        try farmer.register(4, 24, "Rumput", "A") {
            Assert.ok(false, "peternak yang rolenya dicabut seharusnya ditolak");
        } catch Error(string memory reason) {
            Assert.equal(reason, "CT: role tidak berwenang", "revert reason salah");
        }

        ct.setRole(address(farmer), CattleTraceability.Role.Farmer); // pulihkan
    }
}
