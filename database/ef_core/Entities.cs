using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace QuanCafe.Infrastructure.Data
{
    // =====================================================================================
    // 23 C# ENTITY CLASSES CHO HỆ THỐNG QUẢN LÝ QUÁN CÀ PHÊ (.NET 8 EF CORE)
    // =====================================================================================

    // 1. ĐƠN VỊ BỘ PHẬN
    [Table("DON_VI_BO_PHAN")]
    public class DonViBoPhan
    {
        [Key]
        [StringLength(20)]
        public string MaBoPhan { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string TenBoPhan { get; set; } = null!;

        public virtual ICollection<NhanVien> NhanViens { get; set; } = new List<NhanVien>();
    }

    // 2. CHỨC VỤ
    [Table("CHUC_VU")]
    public class ChucVu
    {
        [Key]
        [StringLength(20)]
        public string MaChucVu { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string TenChucVu { get; set; } = null!;

        [Column(TypeName = "decimal(5,2)")]
        public decimal HeSoLuong { get; set; } = 1.00m;

        public virtual ICollection<NhanVien> NhanViens { get; set; } = new List<NhanVien>();
    }

    // 3. NHÂN VIÊN
    [Table("NHAN_VIEN")]
    public class NhanVien
    {
        [Key]
        [StringLength(20)]
        public string MaNhanVien { get; set; } = null!;

        [Required]
        [StringLength(150)]
        public string HoTen { get; set; } = null!;

        public DateTime? NgaySinh { get; set; }

        [Required]
        [StringLength(20)]
        public string SoDienThoai { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string MaChucVu { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string MaBoPhan { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string TrangThaiLamViec { get; set; } = "DangLamViec";

        public DateTime NgayTao { get; set; } = DateTime.UtcNow;

        [ForeignKey("MaChucVu")]
        public virtual ChucVu ChucVu { get; set; } = null!;

        [ForeignKey("MaBoPhan")]
        public virtual DonViBoPhan BoPhan { get; set; } = null!;

        public virtual TaiKhoan? TaiKhoan { get; set; }
        public virtual ICollection<HoaDonBanHang> HoaDons { get; set; } = new List<HoaDonBanHang>();
        public virtual ICollection<BangKeGiaoCa> GiaoCas { get; set; } = new List<BangKeGiaoCa>();
    }

    // 4. TÀI KHOẢN (RBAC 5 VAI TRÒ)
    [Table("TAI_KHOAN")]
    public class TaiKhoan
    {
        [Key]
        [StringLength(20)]
        public string MaTaiKhoan { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string MaNhanVien { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string TenDangNhap { get; set; } = null!;

        [Required]
        [StringLength(255)]
        public string MatKhauHash { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string VaiTro { get; set; } = "PhucVu"; // ChuQuan, QuanLy, ThuNgan, PhaChe, PhucVu

        public bool KichHoat { get; set; } = true;

        [ForeignKey("MaNhanVien")]
        public virtual NhanVien NhanVien { get; set; } = null!;
    }

    // 5. CA LÀM VIỆC
    [Table("CA_LAM_VIEC")]
    public class CaLamViec
    {
        [Key]
        [StringLength(20)]
        public string MaCa { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string TenCa { get; set; } = null!;

        public TimeSpan GioBatDau { get; set; }
        public TimeSpan GioKetThuc { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TienCongTheoCa { get; set; }
    }

    // 6. BẢNG KÊ GIAO CA
    [Table("BANG_KE_GIAO_CA")]
    public class BangKeGiaoCa
    {
        [Key]
        [StringLength(30)]
        public string MaGiaoCa { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string MaCa { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string MaNhanVien { get; set; } = null!;

        public DateTime NgayLamViec { get; set; }
        public DateTime ThoiGianMoCa { get; set; } = DateTime.UtcNow;
        public DateTime? ThoiGianDongCa { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TienDauCa { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DoanhThuTienMat { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DoanhThuChuyenKhoan { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TienMatThucTeTrongKet { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ChenhLechThuaThieu { get; set; }

        [StringLength(30)]
        public string TrangThai { get; set; } = "DangMo";

        [StringLength(20)]
        public string? NguoiXacNhan { get; set; }

        [StringLength(500)]
        public string? GhiChuGiaoCa { get; set; }

        [ForeignKey("MaCa")]
        public virtual CaLamViec CaLamViec { get; set; } = null!;

        [ForeignKey("MaNhanVien")]
        public virtual NhanVien NhanVien { get; set; } = null!;
    }

    // 7. BẢNG THANH TOÁN LƯƠNG
    [Table("BANG_THANH_TOAN_LUONG")]
    public class BangThanhToanLuong
    {
        [Key]
        [StringLength(30)]
        public string MaBangLuong { get; set; } = null!;

        [Required]
        [StringLength(7)]
        public string ThangNam { get; set; } = null!; // YYYY-MM

        [Required]
        [StringLength(20)]
        public string MaNhanVien { get; set; } = null!;

        [Column(TypeName = "decimal(7,2)")]
        public decimal TongGioLam { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal LuongCoBan { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Thuong { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Phat { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ThucLinh { get; private set; }

        public DateTime NgayTinhLuong { get; set; } = DateTime.UtcNow;

        [ForeignKey("MaNhanVien")]
        public virtual NhanVien NhanVien { get; set; } = null!;
    }

    // 8. KHU VỰC
    [Table("KHU_VUC")]
    public class KhuVuc
    {
        [Key]
        [StringLength(20)]
        public string MaKhuVuc { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string TenKhuVuc { get; set; } = null!;

        public virtual ICollection<Ban> Bans { get; set; } = new List<Ban>();
    }

    // 9. BÀN
    [Table("BAN")]
    public class Ban
    {
        [Key]
        [StringLength(20)]
        public string MaBan { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string TenBan { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string MaKhuVuc { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string TrangThai { get; set; } = "Trong"; // Trong, CoKhach, DatTruoc

        public int SoGhe { get; set; } = 4;

        [ForeignKey("MaKhuVuc")]
        public virtual KhuVuc KhuVuc { get; set; } = null!;
    }

    // 10. NHÓM MÓN
    [Table("NHOM_MON")]
    public class NhomMon
    {
        [Key]
        [StringLength(20)]
        public string MaNhom { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string TenNhom { get; set; } = null!;

        public int ThuTuHienThi { get; set; }

        public virtual ICollection<DanhMucMon> Mons { get; set; } = new List<DanhMucMon>();
    }

    // 11. DANH MỤC MÓN
    [Table("DANH_MUC_MON")]
    public class DanhMucMon
    {
        [Key]
        [StringLength(30)]
        public string MaMon { get; set; } = null!;

        [Required]
        [StringLength(150)]
        public string TenMon { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string MaNhom { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string DonViTinh { get; set; } = "Ly";

        [Column(TypeName = "decimal(18,2)")]
        public decimal GiaBanHienHanh { get; set; }

        [StringLength(500)]
        public string? HinhAnh { get; set; }

        public bool DangKinhDoanh { get; set; } = true;

        [ForeignKey("MaNhom")]
        public virtual NhomMon NhomMon { get; set; } = null!;

        public virtual ICollection<CongThucMon> CongThucs { get; set; } = new List<CongThucMon>();
    }

    // 17. NHÀ CUNG CẤP
    [Table("NHA_CUNG_CAP")]
    public class NhaCungCap
    {
        [Key]
        [StringLength(20)]
        public string MaNCC { get; set; } = null!;

        [Required]
        [StringLength(200)]
        public string TenNCC { get; set; } = null!;

        [StringLength(20)]
        public string? SoDienThoai { get; set; }

        [StringLength(255)]
        public string? DiaChi { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CongNoHienTai { get; set; }
    }

    // 18. VẬT TƯ NGUYÊN LIỆU
    [Table("VAT_TU_NGUYEN_LIEU")]
    public class VatTuNguyenLieu
    {
        [Key]
        [StringLength(30)]
        public string MaVatTu { get; set; } = null!;

        [Required]
        [StringLength(150)]
        public string TenVatTu { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string DonViTinh { get; set; } = null!;

        [Column(TypeName = "decimal(12,3)")]
        public decimal SoLuongTonHienTai { get; set; }

        [Column(TypeName = "decimal(12,3)")]
        public decimal MucToiThieuCanCanhBao { get; set; } = 10;

        [Column(TypeName = "decimal(18,2)")]
        public decimal DonGiaBinhQuan { get; set; }
    }

    // 12. CÔNG THỨC MÓN
    [Table("CONG_THUC_MON")]
    public class CongThucMon
    {
        [Key]
        [StringLength(30)]
        public string MaCongThuc { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string MaMon { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string MaVatTu { get; set; } = null!;

        [Column(TypeName = "decimal(10,3)")]
        public decimal SoLuongDinhMuc { get; set; }

        [Required]
        [StringLength(30)]
        public string DonViTinh { get; set; } = null!;

        [StringLength(255)]
        public string? GhiChu { get; set; }

        [ForeignKey("MaMon")]
        public virtual DanhMucMon DanhMucMon { get; set; } = null!;

        [ForeignKey("MaVatTu")]
        public virtual VatTuNguyenLieu VatTuNguyenLieu { get; set; } = null!;
    }

    // 13. KHÁCH HÀNG
    [Table("KHACH_HANG")]
    public class KhachHang
    {
        [Key]
        [StringLength(20)]
        public string MaKhachHang { get; set; } = null!;

        [Required]
        [StringLength(150)]
        public string HoTen { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string SoDienThoai { get; set; } = null!;

        public int DiemTichLuy { get; set; } = 0;

        [Required]
        [StringLength(30)]
        public string HangThanhVien { get; set; } = "Member"; // Member, Silver, Gold, VIP

        public DateTime NgayDangKy { get; set; } = DateTime.UtcNow;
    }

    // 14. HÓA ĐƠN BÁN HÀNG
    [Table("HOA_DON_BAN_HANG")]
    public class HoaDonBanHang
    {
        [Key]
        [StringLength(35)]
        public string SoHoaDon { get; set; } = null!;

        public DateTime NgayGioLap { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(30)]
        public string KenhDatHang { get; set; } = "TaiBan"; // TaiBan, MangDi, GiaoHang

        [StringLength(20)]
        public string? MaBan { get; set; }

        [Required]
        [StringLength(20)]
        public string MaNhanVien { get; set; } = null!;

        [StringLength(20)]
        public string? MaKhachHang { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TongTienMon { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal GiamGia { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TienMatThucThu { get; set; }

        [Required]
        [StringLength(30)]
        public string PhuongThucThanhToan { get; set; } = "TienMat"; // TienMat, QR, The, MoMo, VNPay

        [Required]
        [StringLength(30)]
        public string TrangThaiThanhToan { get; set; } = "ChoThanhToan"; // ChoThanhToan, DaThanhToan, DaHuy

        [StringLength(20)]
        public string? MaCa { get; set; }

        [StringLength(255)]
        public string? GhiChu { get; set; }

        [StringLength(50)]
        public string? OfflineId { get; set; }

        public bool DaDongBo { get; set; } = true;

        [ForeignKey("MaBan")]
        public virtual Ban? Ban { get; set; }

        [ForeignKey("MaNhanVien")]
        public virtual NhanVien NhanVien { get; set; } = null!;

        [ForeignKey("MaKhachHang")]
        public virtual KhachHang? KhachHang { get; set; }

        public virtual ICollection<ChiTietHoaDon> ChiTietHoaDons { get; set; } = new List<ChiTietHoaDon>();
    }

    // 15. CHI TIẾT HÓA ĐƠN
    [Table("CHI_TIET_HOA_DON")]
    public class ChiTietHoaDon
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long MaChiTiet { get; set; }

        [Required]
        [StringLength(35)]
        public string SoHoaDon { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string MaMon { get; set; } = null!;

        public int SoLuong { get; set; } = 1;

        [Column(TypeName = "decimal(18,2)")]
        public decimal DonGia { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ThanhTien { get; private set; }

        [StringLength(255)]
        public string? GhiChuTopping { get; set; }

        [Required]
        [StringLength(30)]
        public string TrangThaiPhaChe { get; set; } = "ChoLam"; // ChoLam, DangLam, HoanThanh

        public DateTime ThoiGianGuiBep { get; set; } = DateTime.UtcNow;
        public DateTime? ThoiGianHoanThanh { get; set; }

        [ForeignKey("SoHoaDon")]
        public virtual HoaDonBanHang HoaDonBanHang { get; set; } = null!;

        [ForeignKey("MaMon")]
        public virtual DanhMucMon DanhMucMon { get; set; } = null!;
    }

    // 16. YÊU CẦU HỦY ĐỔI MÓN
    [Table("YEU_CAU_HUY_DOI_MON")]
    public class YeuCauHuyDoiMon
    {
        [Key]
        [StringLength(35)]
        public string MaYeuCau { get; set; } = null!;

        [Required]
        [StringLength(35)]
        public string SoHoaDon { get; set; } = null!;

        public long MaChiTiet { get; set; }

        [Required]
        [StringLength(255)]
        public string LyDoHuy { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string NguoiYeuCau { get; set; } = null!;

        [StringLength(20)]
        public string? NguoiPheDuyet { get; set; }

        public DateTime ThoiGianYeuCau { get; set; } = DateTime.UtcNow;
        public DateTime? ThoiGianDuyet { get; set; }

        [StringLength(30)]
        public string TrangThaiDuyet { get; set; } = "ChoDuyet"; // ChoDuyet, DaDuyet, TuChoi
    }

    // 19. PHIẾU NHẬP KHO
    [Table("PHIEU_NHAP_KHO")]
    public class PhieuNhapKho
    {
        [Key]
        [StringLength(35)]
        public string SoPhieuNhap { get; set; } = null!;

        public DateTime NgayNhap { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(20)]
        public string MaNCC { get; set; } = null!;

        [Required]
        [StringLength(20)]
        public string MaNhanVien { get; set; } = null!;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TongTienNhap { get; set; }

        [StringLength(30)]
        public string TrangThai { get; set; } = "DaNhap";

        [StringLength(255)]
        public string? GhiChu { get; set; }

        [ForeignKey("MaNCC")]
        public virtual NhaCungCap NhaCungCap { get; set; } = null!;

        public virtual ICollection<ChiTietPhieuNhap> ChiTietPhieuNhaps { get; set; } = new List<ChiTietPhieuNhap>();
    }

    // 20. CHI TIẾT PHIẾU NHẬP
    [Table("CHI_TIET_PHIEU_NHAP")]
    public class ChiTietPhieuNhap
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long MaCTNhap { get; set; }

        [Required]
        [StringLength(35)]
        public string SoPhieuNhap { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string MaVatTu { get; set; } = null!;

        [Column(TypeName = "decimal(12,3)")]
        public decimal SoLuongNhap { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DonGiaNhap { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ThanhTien { get; private set; }

        [ForeignKey("SoPhieuNhap")]
        public virtual PhieuNhapKho PhieuNhapKho { get; set; } = null!;

        [ForeignKey("MaVatTu")]
        public virtual VatTuNguyenLieu VatTuNguyenLieu { get; set; } = null!;
    }

    // 21. PHIẾU HỦY HAO HỤT
    [Table("PHIEU_HUY_HAO_HUT")]
    public class PhieuHuyHaoHut
    {
        [Key]
        [StringLength(35)]
        public string SoPhieuHuy { get; set; } = null!;

        public DateTime NgayHuy { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(20)]
        public string MaNhanVien { get; set; } = null!;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TongGiaTriHaoHut { get; set; }

        [Required]
        [StringLength(255)]
        public string LyDoHaoHut { get; set; } = null!;

        public virtual ICollection<ChiTietHuyHaoHut> ChiTietHuys { get; set; } = new List<ChiTietHuyHaoHut>();
    }

    // 22. CHI TIẾT HỦY HAO HỤT
    [Table("CHI_TIET_HUY_HAO_HUT")]
    public class ChiTietHuyHaoHut
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long MaCTHuy { get; set; }

        [Required]
        [StringLength(35)]
        public string SoPhieuHuy { get; set; } = null!;

        [Required]
        [StringLength(30)]
        public string MaVatTu { get; set; } = null!;

        [Column(TypeName = "decimal(12,3)")]
        public decimal SoLuongHaoHut { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal GiaTri { get; set; }

        [ForeignKey("SoPhieuHuy")]
        public virtual PhieuHuyHaoHut PhieuHuyHaoHut { get; set; } = null!;

        [ForeignKey("MaVatTu")]
        public virtual VatTuNguyenLieu VatTuNguyenLieu { get; set; } = null!;
    }

    // 23. SỔ QUỸ THU CHI
    [Table("SO_QUY_THU_CHI")]
    public class SoQuyThuChi
    {
        [Key]
        [StringLength(35)]
        public string MaPhieuThuChi { get; set; } = null!;

        [Required]
        [StringLength(10)]
        public string LoaiPhieu { get; set; } = "Thu"; // Thu / Chi

        public DateTime NgayPhatSinh { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "decimal(18,2)")]
        public decimal SoTien { get; set; }

        [Required]
        [StringLength(20)]
        public string MaNhanVien { get; set; } = null!;

        [StringLength(150)]
        public string? DoiTuongNopNhan { get; set; }

        [StringLength(50)]
        public string? ChungTuGoc { get; set; }

        [Required]
        [StringLength(255)]
        public string LyDo { get; set; } = null!;

        [ForeignKey("MaNhanVien")]
        public virtual NhanVien NhanVien { get; set; } = null!;
    }

    // =====================================================================================
    // DB CONTEXT
    // =====================================================================================
    public class CoffeeShopDbContext : DbContext
    {
        public CoffeeShopDbContext(DbContextOptions<CoffeeShopDbContext> options) : base(options) { }

        public DbSet<DonViBoPhan> DonViBoPhans => Set<DonViBoPhan>();
        public DbSet<ChucVu> ChucVus => Set<ChucVu>();
        public DbSet<NhanVien> NhanViens => Set<NhanVien>();
        public DbSet<TaiKhoan> TaiKhoans => Set<TaiKhoan>();
        public DbSet<CaLamViec> CaLamViecs => Set<CaLamViec>();
        public DbSet<BangKeGiaoCa> BangKeGiaoCas => Set<BangKeGiaoCa>();
        public DbSet<BangThanhToanLuong> BangThanhToanLuongs => Set<BangThanhToanLuong>();
        public DbSet<KhuVuc> KhuVucs => Set<KhuVuc>();
        public DbSet<Ban> Bans => Set<Ban>();
        public DbSet<NhomMon> NhomMons => Set<NhomMon>();
        public DbSet<DanhMucMon> DanhMucMons => Set<DanhMucMon>();
        public DbSet<CongThucMon> CongThucMons => Set<CongThucMon>();
        public DbSet<KhachHang> KhachHangs => Set<KhachHang>();
        public DbSet<HoaDonBanHang> HoaDonBanHangs => Set<HoaDonBanHang>();
        public DbSet<ChiTietHoaDon> ChiTietHoaDons => Set<ChiTietHoaDon>();
        public DbSet<YeuCauHuyDoiMon> YeuCauHuyDoiMons => Set<YeuCauHuyDoiMon>();
        public DbSet<NhaCungCap> NhaCungCaps => Set<NhaCungCap>();
        public DbSet<VatTuNguyenLieu> VatTuNguyenLieus => Set<VatTuNguyenLieu>();
        public DbSet<PhieuNhapKho> PhieuNhapKhos => Set<PhieuNhapKho>();
        public DbSet<ChiTietPhieuNhap> ChiTietPhieuNhaps => Set<ChiTietPhieuNhap>();
        public DbSet<PhieuHuyHaoHut> PhieuHuyHaoHuts => Set<PhieuHuyHaoHut>();
        public DbSet<ChiTietHuyHaoHut> ChiTietHuyHaoHuts => Set<ChiTietHuyHaoHut>();
        public DbSet<SoQuyThuChi> SoQuyThuChis => Set<SoQuyThuChi>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Cấu hình Unique & Index
            modelBuilder.Entity<TaiKhoan>().HasIndex(t => t.TenDangNhap).IsUnique();
            modelBuilder.Entity<KhachHang>().HasIndex(k => k.SoDienThoai).IsUnique();
            modelBuilder.Entity<HoaDonBanHang>().HasIndex(h => h.NgayGioLap);
            modelBuilder.Entity<HoaDonBanHang>().HasIndex(h => h.TrangThaiThanhToan);
            modelBuilder.Entity<ChiTietHoaDon>().HasIndex(c => c.TrangThaiPhaChe);
        }
    }
}
