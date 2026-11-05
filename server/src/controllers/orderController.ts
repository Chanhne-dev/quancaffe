import { Request, Response } from 'express';
import { OrderService } from '../services/orderService.js';
import { PrinterService } from '../services/printerService.js';

export class OrderController {
  public static async createOrder(req: Request, res: Response) {
    try {
      const result = OrderService.createOrder(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public static async payOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { phuongThucThanhToan, maNhanVien } = req.body;
      const result = OrderService.processPayment(id, phuongThucThanhToan || 'TienMat', maNhanVien || 'NV03');
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public static async getKdsTickets(req: Request, res: Response) {
    try {
      const tickets = OrderService.getActiveKdsTickets();
      res.json({ success: true, data: tickets });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateKdsItemStatus(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const { status } = req.body;
      const result = OrderService.updateKdsItemStatus(Number(itemId), status);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public static async getReceipt(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const receipt = PrinterService.generateEscPosReceipt(id);
      res.json({
        success: true,
        data: {
          textContent: receipt.textContent,
          escPosBase64: receipt.buffer.toString('base64')
        }
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Offline Reconciliation Worker endpoint
   * Đẩy danh sách các đơn hàng offline lên server khi có mạng lại
   */
  public static async reconcileOfflineOrders(req: Request, res: Response) {
    try {
      const { orders } = req.body as { orders: any[] };
      const syncedOrders: string[] = [];
      const failedOrders: any[] = [];

      for (const orderDto of orders) {
        try {
          const result = OrderService.createOrder({
            ...orderDto,
            thanhToanNgay: true
          });
          syncedOrders.push(result.data.soHoaDon);
        } catch (e: any) {
          failedOrders.push({ offlineId: orderDto.offlineId, error: e.message });
        }
      }

      res.json({
        success: true,
        message: `Đồng bộ hoàn tất ${syncedOrders.length} đơn hàng ngoại tuyến.`,
        syncedOrders,
        failedOrders
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
