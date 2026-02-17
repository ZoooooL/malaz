import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * واجهة إعدادات الاتصال بـ Odoo
 */
export interface OdooConfig {
  serverUrl: string;
  database?: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

/**
 * واجهة نتيجة الاستدعاء
 */
export interface OdooResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * خدمة الربط مع Odoo ERP
 */
export class OdooService {
  private config: OdooConfig | null = null;
  private sessionId: string | null = null;
  private axiosInstance: AxiosInstance | null = null;
  private userId: number | null = null;

  /**
   * تهيئة الخدمة
   */
  async initialize(config: OdooConfig): Promise<void> {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.serverUrl,
      timeout: 10000,
      headers: config.apiKey
        ? {
            Authorization: `Bearer ${config.apiKey}`,
            'X-API-Key': config.apiKey,
          }
        : undefined,
    });

    // محاولة تحميل بيانات الجلسة المحفوظة
    await this.loadSession();
  }

  /**
   * تحميل بيانات الجلسة من التخزين المحلي
   */
  private async loadSession(): Promise<void> {
    try {
      const savedSession = await AsyncStorage.getItem('odoo_session');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        this.sessionId = session.sessionId;
        this.userId = session.userId;
      }
    } catch (error) {
      console.error('خطأ في تحميل الجلسة:', error);
    }
  }

  /**
   * حفظ بيانات الجلسة
   */
  private async saveSession(): Promise<void> {
    try {
      if (this.sessionId && this.userId) {
        await AsyncStorage.setItem(
          'odoo_session',
          JSON.stringify({
            sessionId: this.sessionId,
            userId: this.userId,
          })
        );
      }
    } catch (error) {
      console.error('خطأ في حفظ الجلسة:', error);
    }
  }

  /**
   * تسجيل الدخول إلى Odoo
   */
  async login(): Promise<boolean> {
    try {
      if (!this.config || !this.axiosInstance) {
        throw new Error('لم يتم تهيئة الخدمة');
      }

      if (!this.config.database || !this.config.username || !this.config.password) {
        return false;
      }

      const response = await this.axiosInstance.post('/web/session/authenticate', {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: this.config.database,
          login: this.config.username,
          password: this.config.password,
        },
        id: 1,
      });

      if (response.data.result) {
        this.userId = response.data.result.uid;
        const setCookie = response.headers['set-cookie']?.[0];
        if (setCookie) {
          this.sessionId = setCookie;
        }
        await this.saveSession();
        return true;
      }

      return false;
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      return false;
    }
  }

  /**
   * استدعاء JSON-RPC عام
   */
  private async callJsonRpc(method: string, params: any = {}): Promise<any> {
    try {
      if (!this.axiosInstance) {
        throw new Error('لم يتم تهيئة الخدمة');
      }

      const response = await this.axiosInstance.post('/web/dataset/call_kw', {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: params.model,
          method: params.method,
          args: params.args || [],
          kwargs: params.kwargs || {},
        },
        id: Math.random(),
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error) {
      console.error('خطأ في استدعاء JSON-RPC:', error);
      throw error;
    }
  }

  /**
   * الحصول على مبيعات اليوم
   */
  async getSalesToday(): Promise<OdooResponse> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await this.callJsonRpc('search_read', {
        model: 'sale.order',
        method: 'search_read',
        args: [
          [
            ['date_order', '>=', today],
            ['date_order', '<', new Date(Date.now() + 86400000).toISOString().split('T')[0]],
            ['state', 'not in', ['draft', 'cancel']],
          ],
        ],
        kwargs: {
          fields: ['id', 'name', 'amount_total', 'partner_id', 'date_order'],
        },
      });

      const totalAmount = result.reduce((sum: number, order: any) => sum + order.amount_total, 0);

      return {
        success: true,
        data: {
          orders: result,
          totalAmount,
          count: result.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ في الحصول على المبيعات',
      };
    }
  }

  /**
   * الحصول على مبيعات هذا الشهر
   */
  async getSalesThisMonth(): Promise<OdooResponse> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      const result = await this.callJsonRpc('search_read', {
        model: 'sale.order',
        method: 'search_read',
        args: [
          [
            ['date_order', '>=', startOfMonth],
            ['date_order', '<', endOfMonth],
            ['state', 'not in', ['draft', 'cancel']],
          ],
        ],
        kwargs: {
          fields: ['id', 'name', 'amount_total', 'partner_id', 'date_order'],
        },
      });

      const totalAmount = result.reduce((sum: number, order: any) => sum + order.amount_total, 0);

      return {
        success: true,
        data: {
          orders: result,
          totalAmount,
          count: result.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ في الحصول على مبيعات الشهر',
      };
    }
  }

  /**
   * الحصول على الفواتير غير المدفوعة
   */
  async getUnpaidInvoices(): Promise<OdooResponse> {
    try {
      let result: any[] = [];

      try {
        result = await this.callJsonRpc('search_read', {
          model: 'account.move',
          method: 'search_read',
          args: [
            [
              ['move_type', '=', 'out_invoice'],
              ['payment_state', 'in', ['not_paid', 'partial']],
              ['state', '=', 'posted'],
            ],
          ],
          kwargs: {
            fields: ['id', 'name', 'amount_total', 'partner_id', 'invoice_date', 'invoice_date_due'],
          },
        });
      } catch {
        result = await this.callJsonRpc('search_read', {
          model: 'account.invoice',
          method: 'search_read',
          args: [
            [
              ['state', '=', 'open'],
              ['type', '=', 'out_invoice'],
            ],
          ],
          kwargs: {
            fields: ['id', 'number', 'amount_total', 'partner_id', 'date_invoice', 'date_due'],
          },
        });
      }

      return {
        success: true,
        data: {
          invoices: result,
          count: result.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ في الحصول على الفواتير',
      };
    }
  }

  /**
   * الحصول على المنتجات منخفضة المخزون
   */
  async getLowStockProducts(): Promise<OdooResponse> {
    try {
      const result = await this.callJsonRpc('search_read', {
        model: 'product.product',
        method: 'search_read',
        args: [
          [
            ['qty_available', '<', 10],
            ['type', '=', 'product'],
          ],
        ],
        kwargs: {
          fields: ['id', 'name', 'qty_available', 'list_price', 'default_code'],
        },
      });

      return {
        success: true,
        data: {
          products: result,
          count: result.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ في الحصول على المنتجات',
      };
    }
  }

  /**
   * الحصول على أعلى العملاء
   */
  async getTopCustomers(period: 'day' | 'week' | 'month' = 'month'): Promise<OdooResponse> {
    try {
      const now = new Date();
      let startDate = new Date();

      if (period === 'day') {
        startDate.setDate(now.getDate() - 1);
      } else if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      const result = await this.callJsonRpc('search_read', {
        model: 'sale.order',
        method: 'search_read',
        args: [
          [
            ['date_order', '>=', startDate.toISOString()],
            ['state', 'not in', ['draft', 'cancel']],
          ],
        ],
        kwargs: {
          fields: ['id', 'partner_id', 'amount_total', 'date_order'],
        },
      });

      // تجميع المبيعات حسب العميل
      const customerSales: Record<string, any> = {};
      result.forEach((order: any) => {
        const customerId = order.partner_id[0];
        const customerName = order.partner_id[1];

        if (!customerSales[customerId]) {
          customerSales[customerId] = {
            id: customerId,
            name: customerName,
            totalSales: 0,
            orderCount: 0,
          };
        }

        customerSales[customerId].totalSales += order.amount_total;
        customerSales[customerId].orderCount += 1;
      });

      // ترتيب العملاء حسب إجمالي المبيعات
      const topCustomers = Object.values(customerSales)
        .sort((a: any, b: any) => b.totalSales - a.totalSales)
        .slice(0, 10);

      return {
        success: true,
        data: {
          customers: topCustomers,
          count: topCustomers.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ في الحصول على العملاء',
      };
    }
  }

  /**
   * البحث عن عميل بالاسم
   */
  async searchCustomer(name: string): Promise<OdooResponse> {
    try {
      const result = await this.callJsonRpc('search_read', {
        model: 'res.partner',
        method: 'search_read',
        args: [
          [
            ['name', 'ilike', name],
            ['customer', '=', true],
          ],
        ],
        kwargs: {
          fields: ['id', 'name', 'email', 'phone', 'city'],
          limit: 10,
        },
      });

      return {
        success: true,
        data: {
          customers: result,
          count: result.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ في البحث عن العميل',
      };
    }
  }

  /**
   * إنشاء عرض سعر جديد
   */
  async createQuote(customerId: number, lines: any[]): Promise<OdooResponse> {
    try {
      const orderLines = lines.map(line => [0, 0, line]);
      
      const result = await this.callJsonRpc('create', {
        model: 'sale.order',
        method: 'create',
        args: [
          {
            partner_id: customerId,
            order_line: orderLines,
            state: 'draft',
          },
        ],
      });

      return {
        success: true,
        data: {
          quoteId: result,
          message: 'تم إنشاء عرض السعر بنجاح',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ في إنشاء عرض السعر',
      };
    }
  }

  /**
   * تسجيل الخروج
   */
  async logout(): Promise<void> {
    try {
      if (this.axiosInstance) {
        await this.axiosInstance.post('/web/session/destroy', {});
      }
      this.sessionId = null;
      this.userId = null;
      await AsyncStorage.removeItem('odoo_session');
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
    }
  }

  /**
   * التحقق من حالة الاتصال
   */
  isConnected(): boolean {
    return this.sessionId !== null && this.userId !== null;
  }

  /**
   * الحصول على معرف المستخدم
   */
  getUserId(): number | null {
    return this.userId;
  }
}

// إنشاء نسخة واحدة من الخدمة
let odooServiceInstance: OdooService | null = null;

export function getOdooService(): OdooService {
  if (!odooServiceInstance) {
    odooServiceInstance = new OdooService();
  }
  return odooServiceInstance;
}
