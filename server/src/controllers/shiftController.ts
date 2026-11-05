import { Request, Response } from 'express';
import { ShiftService } from '../services/shiftService.js';

export class ShiftController {
  public static getCurrentShift(req: Request, res: Response) {
    try {
      const shift = ShiftService.getCurrentShift();
      res.json({ success: true, data: shift });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static openShift(req: Request, res: Response) {
    try {
      const { maCa, maNhanVien, tienDauCa, ghiChu } = req.body;
      const result = ShiftService.openShift(maCa || 'CA_SANG', maNhanVien || 'NV03', Number(tienDauCa || 0), ghiChu);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public static closeShift(req: Request, res: Response) {
    try {
      const { maGiaoCa, tienMatThucTe, ghiChu } = req.body;
      const result = ShiftService.closeShift(maGiaoCa, Number(tienMatThucTe), ghiChu);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public static approveShift(req: Request, res: Response) {
    try {
      const { maGiaoCa, maNguoiXacNhan } = req.body;
      const result = ShiftService.approveShift(maGiaoCa, maNguoiXacNhan || 'NV02');
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
