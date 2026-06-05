import db from './models/index.js';
import dotenv from 'dotenv';
dotenv.config();

const { Order } = db;

class PaymeService {
  constructor() {
    this.merchantId = process.env.PAYME_MERCHANT_ID || 'test_merchant_id';
    this.secretKey = process.env.PAYME_SECRET_KEY || 'test_secret_key';
    this.isTest = process.env.PAYME_IS_TEST === 'true';
    this.baseUrl = this.isTest ? 'https://test.paycom.uz' : 'https://checkout.paycom.uz';
  }

  generateCheckoutUrl(amount, orderId, returnUrl = 'http://localhost:3000/orders') {
    // Payme tiyinda ishlaydi
    const amountTiyin = amount * 100;
    
    // Format: m=merchant_id;a=amount;ac.order_id=orderId;c=return_url
    const params = `m=${this.merchantId};a=${amountTiyin};ac.order_id=${orderId};c=${returnUrl}`;
    const encoded = Buffer.from(params).toString('base64');
    
    return `${this.baseUrl}/${encoded}`;
  }

  verifyAuth(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Basic ')) return false;
    
    try {
      const decoded = Buffer.from(authHeader.substring(6), 'base64').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length !== 2) return false;
      const key = parts[1];
      return key === this.secretKey;
    } catch (err) {
      return false;
    }
  }

  async handleWebhook(req, res) {
    if (!this.verifyAuth(req)) {
      return res.json({ error: { code: -32504, message: 'Auth failed' } });
    }

    const { method, params, id: rpcId } = req.body;
    if (!method) return res.json({ error: { code: -32601, message: 'Method not found' }, id: rpcId });

    try {
      if (method === 'CheckPerformTransaction') {
        return await this.checkPerformTransaction(params, rpcId, res);
      } else if (method === 'CreateTransaction') {
        return await this.createTransaction(params, rpcId, res);
      } else if (method === 'PerformTransaction') {
        return await this.performTransaction(params, rpcId, res);
      } else if (method === 'CancelTransaction') {
        return await this.cancelTransaction(params, rpcId, res);
      } else {
        return res.json({ error: { code: -32601, message: 'Method not found' }, id: rpcId });
      }
    } catch (err) {
      console.error('Payme Webhook error:', err);
      return res.json({ error: { code: -32400, message: 'System error' }, id: rpcId });
    }
  }

  async checkPerformTransaction(params, rpcId, res) {
    const orderId = params.account ? params.account.order_id : null;
    const amount = params.amount;

    if (!orderId) {
      return res.json({ error: { code: -31050, message: 'Order not found' }, id: rpcId });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.json({ error: { code: -31050, message: 'Order not found' }, id: rpcId });
    }

    if (order.status === 'cancelled' || order.status === 'failed') {
      return res.json({ error: { code: -31050, message: 'Order is cancelled or failed' }, id: rpcId });
    }

    if (amount !== order.total * 100) {
      return res.json({ error: { code: -31001, message: 'Incorrect amount' }, id: rpcId });
    }

    return res.json({ result: { allow: true }, id: rpcId });
  }

  async createTransaction(params, rpcId, res) {
    const orderId = params.account ? params.account.order_id : null;
    const extId = params.id;
    const amount = params.amount;

    if (!orderId) return res.json({ error: { code: -31050, message: 'Order not found' }, id: rpcId });
    if (!extId) return res.json({ error: { code: -31003, message: 'external_id (transaction) is required' }, id: rpcId });

    const existingOrderWithExtId = await Order.findOne({ where: { paymeTransactionId: extId } });
    if (existingOrderWithExtId) {
      if (existingOrderWithExtId.id !== orderId) {
        return res.json({ error: { code: -31050, message: 'Transaction belongs to different order' }, id: rpcId });
      }

      if (existingOrderWithExtId.paymeState === 2 || existingOrderWithExtId.paymeState === 1) {
        // Idempotency
        return res.json({
          result: {
            create_time: new Date(existingOrderWithExtId.paymeCreateTime).getTime(),
            transaction: existingOrderWithExtId.paymeTransactionId,
            state: existingOrderWithExtId.paymeState
          },
          id: rpcId
        });
      }

      return res.json({ error: { code: -31008, message: 'Transaction cancelled or failed' }, id: rpcId });
    }

    const order = await Order.findByPk(orderId);
    if (!order) return res.json({ error: { code: -31050, message: 'Order not found' }, id: rpcId });

    if (amount !== order.total * 100) return res.json({ error: { code: -31001, message: 'Incorrect amount' }, id: rpcId });

    if (order.status === 'pending') {
      const now = new Date().toISOString();
      await order.update({
        paymeTransactionId: extId,
        paymeState: 1, // processing
        paymeCreateTime: now
      });

      return res.json({
        result: {
          create_time: new Date(now).getTime(),
          transaction: extId,
          state: 1
        },
        id: rpcId
      });
    }

    return res.json({ error: { code: -31050, message: 'Order already processed or cancelled' }, id: rpcId });
  }

  async performTransaction(params, rpcId, res) {
    const extId = params.id;
    if (!extId) return res.json({ error: { code: -31003, message: 'Transaction not found' }, id: rpcId });

    const order = await Order.findOne({ where: { paymeTransactionId: extId } });
    if (!order) return res.json({ error: { code: -31003, message: 'Transaction not found' }, id: rpcId });

    if (order.paymeState === 1) {
      const now = new Date().toISOString();
      await order.update({
        paymeState: 2, // completed
        paymePerformTime: now,
        status: 'paid'
      });

      return res.json({
        result: {
          transaction: extId,
          perform_time: new Date(now).getTime(),
          state: 2
        },
        id: rpcId
      });
    } else if (order.paymeState === 2) {
      // Idempotency
      return res.json({
        result: {
          transaction: extId,
          perform_time: new Date(order.paymePerformTime).getTime(),
          state: 2
        },
        id: rpcId
      });
    }

    return res.json({ error: { code: -31008, message: 'Transaction is cancelled or failed' }, id: rpcId });
  }

  async cancelTransaction(params, rpcId, res) {
    const extId = params.id;
    const reason = params.reason || 0;
    if (!extId) return res.json({ error: { code: -31003, message: 'Transaction not found' }, id: rpcId });

    const order = await Order.findOne({ where: { paymeTransactionId: extId } });
    if (!order) return res.json({ error: { code: -31003, message: 'Transaction not found' }, id: rpcId });

    if (order.paymeState === 1) {
      // Cancel before complete
      const now = new Date().toISOString();
      await order.update({
        paymeState: -1,
        paymeCancelTime: now,
        paymeReason: reason,
        status: 'cancelled'
      });
      return res.json({
        result: {
          transaction: extId,
          cancel_time: new Date(now).getTime(),
          state: -1
        },
        id: rpcId
      });
    } else if (order.paymeState === 2) {
      // Refund
      const now = new Date().toISOString();
      await order.update({
        paymeState: -2,
        paymeCancelTime: now,
        paymeReason: reason,
        status: 'refunded'
      });
      return res.json({
        result: {
          transaction: extId,
          cancel_time: new Date(now).getTime(),
          state: -2
        },
        id: rpcId
      });
    } else if (order.paymeState === -1 || order.paymeState === -2) {
      // Idempotency
      return res.json({
        result: {
          transaction: extId,
          cancel_time: new Date(order.paymeCancelTime).getTime(),
          state: order.paymeState
        },
        id: rpcId
      });
    }

    return res.json({ error: { code: -31007, message: 'Transaction cannot be cancelled in current state' }, id: rpcId });
  }
}

const paymeService = new PaymeService();
export default paymeService;
