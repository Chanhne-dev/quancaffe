import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/index.js';
import { db } from '../db/database.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    maNhanVien: string;
    hoTen: string;
    vaiTro: Role;
    tenDangNhap: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Đọc từ header x-user-role hoặc query param role phục vụ linh hoạt testing & demo
  const userHeader = (req.headers['x-user-role'] as string) || (req.query.role as string);
  const usernameHeader = req.headers['x-username'] as string || 'cashier';

  if (userHeader) {
    req.user = {
      maNhanVien: userHeader === 'ChuQuan' ? 'NV01' : userHeader === 'QuanLy' ? 'NV02' : 'NV03',
      hoTen: userHeader === 'ChuQuan' ? 'Nguyễn Hoàng Long (Chủ Quán)' : userHeader === 'QuanLy' ? 'Trần Minh Đức (Quản Lý)' : 'Lê Thị Mai (Thu Ngân)',
      vaiTro: userHeader as Role,
      tenDangNhap: usernameHeader
    };
    return next();
  }

  // Tra cứu theo tên đăng nhập mặc định
  const account = db.prepare(`
    SELECT t.MaTaiKhoan, t.VaiTro, t.TenDangNhap, n.MaNhanVien, n.HoTen
    FROM TAI_KHOAN t
    JOIN NHAN_VIEN n ON t.MaNhanVien = n.MaNhanVien
    WHERE t.TenDangNhap = ? AND t.KichHoat = 1
  `).get(usernameHeader) as any;

  if (account) {
    req.user = {
      maNhanVien: account.MaNhanVien,
      hoTen: account.HoTen,
      vaiTro: account.VaiTro as Role,
      tenDangNhap: account.TenDangNhap
    };
  } else {
    // Fallback default
    req.user = {
      maNhanVien: 'NV03',
      hoTen: 'Lê Thị Mai (Thu ngân)',
      vaiTro: 'ThuNgan',
      tenDangNhap: 'cashier'
    };
  }

  next();
}

export function requireRoles(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
    }

    if (!allowedRoles.includes(req.user.vaiTro) && req.user.vaiTro !== 'ChuQuan') {
      return res.status(403).json({
        success: false,
        message: `Từ chối truy cập: Vai trò '${req.user.vaiTro}' không có quyền thực hiện thao tác này.`
      });
    }

    next();
  };
}
