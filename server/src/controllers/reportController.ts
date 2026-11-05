import { Request, Response } from 'express';
import { ReportService } from '../services/reportService.js';

export class ReportController {
  public static getProfitAndLoss(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const report = ReportService.getProfitAndLoss(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
