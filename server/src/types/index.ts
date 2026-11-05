export type Role = 'ChuQuan' | 'QuanLy' | 'ThuNgan' | 'PhaChe' | 'PhucVu';

export type PaymentMethod = 'TienMat' | 'QR' | 'The' | 'MoMo' | 'VNPay';
export type PaymentStatus = 'ChoThanhToan' | 'DaThanhToan' | 'DaHuy';
export type KitchenStatus = 'ChoLam' | 'DangLam' | 'HoanThanh';
export type OrderChannel = 'TaiBan' | 'MangDi' | 'GiaoHang';
export type TableStatus = 'Trong' | 'CoKhach' | 'DatTruoc';

export interface UserSession {
  maNhanVien: string;
  hoTen: string;
  vaiTro: Role;
  tenDangNhap: string;
}

export interface OrderItemInput {
  maMon: string;
  soLuong: number;
  donGia: number;
  ghiChuTopping?: string;
}

export interface CreateOrderDTO {
  soHoaDon?: string;
  kenhDatHang: OrderChannel;
  maBan?: string;
  maNhanVien: string;
  soDienThoaiKhach?: string;
  maKhachHang?: string;
  items: OrderItemInput[];
  giamGia?: number;
  phuongThucThanhToan: PaymentMethod;
  thanhToanNgay?: boolean;
  ghiChu?: string;
  offlineId?: string;
}

export interface LowStockAlert {
  maVatTu: string;
  tenVatTu: string;
  soLuongTonHienTai: number;
  mucToiThieuCanCanhBao: number;
  donViTinh: string;
  timestamp: string;
}
