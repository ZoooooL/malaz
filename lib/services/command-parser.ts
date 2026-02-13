/**
 * أنواع الأوامر المدعومة
 */
export enum CommandType {
  SALES_TODAY = 'sales_today',
  SALES_THIS_MONTH = 'sales_this_month',
  TOP_CUSTOMERS = 'top_customers',
  UNPAID_INVOICES = 'unpaid_invoices',
  LOW_STOCK = 'low_stock',
  CREATE_QUOTE = 'create_quote',
  CUSTOMER_INFO = 'customer_info',
  INVOICE_DETAILS = 'invoice_details',
  PRODUCT_INFO = 'product_info',
  UNKNOWN = 'unknown',
}

/**
 * واجهة نتيجة التحليل
 */
export interface ParsedCommand {
  type: CommandType;
  confidence: number; // من 0 إلى 1
  parameters: Record<string, any>;
  originalText: string;
}

/**
 * محرك فهم الأوامر الصوتية
 */
export class CommandParser {
  /**
   * تحليل النص واكتشاف نوع الأمر
   */
  static parseCommand(input: string): ParsedCommand {
    const text = input.toLowerCase().trim();
    const originalText = input;

    // قائمة الأنماط والكلمات المفتاحية
    const patterns = [
      {
        type: CommandType.SALES_TODAY,
        keywords: ['مبيعات اليوم', 'المبيعات اليوم', 'كم مبيعات اليوم', 'إجمالي المبيعات اليوم'],
        confidence: 0.95,
      },
      {
        type: CommandType.SALES_THIS_MONTH,
        keywords: ['مبيعات هذا الشهر', 'مبيعات الشهر', 'المبيعات هذا الشهر', 'كم مبيعات الشهر'],
        confidence: 0.95,
      },
      {
        type: CommandType.TOP_CUSTOMERS,
        keywords: ['أعلى العملاء', 'أفضل العملاء', 'أكبر العملاء', 'أعلى العملاء هذا الشهر'],
        confidence: 0.9,
      },
      {
        type: CommandType.UNPAID_INVOICES,
        keywords: ['الفواتير غير المدفوعة', 'الفواتير المعلقة', 'الفواتير المتأخرة', 'الفواتير غير المسددة'],
        confidence: 0.95,
      },
      {
        type: CommandType.LOW_STOCK,
        keywords: ['المخزون المنخفض', 'المنتجات منخفضة المخزون', 'المخزون قليل', 'المنتجات الناقصة'],
        confidence: 0.95,
      },
      {
        type: CommandType.CREATE_QUOTE,
        keywords: ['أنشئ عرض سعر', 'إنشاء عرض سعر', 'عرض سعر جديد', 'أضف عرض سعر'],
        confidence: 0.9,
      },
      {
        type: CommandType.CUSTOMER_INFO,
        keywords: ['معلومات العميل', 'بيانات العميل', 'عن العميل', 'تفاصيل العميل'],
        confidence: 0.85,
      },
      {
        type: CommandType.INVOICE_DETAILS,
        keywords: ['تفاصيل الفاتورة', 'معلومات الفاتورة', 'بيانات الفاتورة'],
        confidence: 0.9,
      },
      {
        type: CommandType.PRODUCT_INFO,
        keywords: ['معلومات المنتج', 'بيانات المنتج', 'تفاصيل المنتج', 'عن المنتج'],
        confidence: 0.85,
      },
    ];

    // البحث عن الأنماط المطابقة
    for (const pattern of patterns) {
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword)) {
          const parameters = this.extractParameters(text, pattern.type);
          return {
            type: pattern.type,
            confidence: pattern.confidence,
            parameters,
            originalText,
          };
        }
      }
    }

    // إذا لم يتم العثور على أي نمط
    return {
      type: CommandType.UNKNOWN,
      confidence: 0,
      parameters: {},
      originalText,
    };
  }

  /**
   * استخراج المعاملات من النص
   */
  private static extractParameters(text: string, commandType: CommandType): Record<string, any> {
    const parameters: Record<string, any> = {};

    switch (commandType) {
      case CommandType.CREATE_QUOTE:
        // البحث عن اسم العميل
        const customerMatch = text.match(/للعميل\s+(\w+)/);
        if (customerMatch) {
          parameters.customerName = customerMatch[1];
        }
        break;

      case CommandType.CUSTOMER_INFO:
        // البحث عن اسم العميل
        const customerInfoMatch = text.match(/العميل\s+(\w+)|(\w+)\s+العميل/);
        if (customerInfoMatch) {
          parameters.customerName = customerInfoMatch[1] || customerInfoMatch[2];
        }
        break;

      case CommandType.INVOICE_DETAILS:
        // البحث عن رقم الفاتورة
        const invoiceMatch = text.match(/فاتورة\s+(\d+)|رقم\s+(\d+)/);
        if (invoiceMatch) {
          parameters.invoiceNumber = invoiceMatch[1] || invoiceMatch[2];
        }
        break;

      case CommandType.PRODUCT_INFO:
        // البحث عن اسم المنتج
        const productMatch = text.match(/المنتج\s+(.+?)(?:\s+|$)|منتج\s+(.+?)(?:\s+|$)/);
        if (productMatch) {
          parameters.productName = productMatch[1] || productMatch[2];
        }
        break;

      case CommandType.TOP_CUSTOMERS:
        // البحث عن الفترة الزمنية
        if (text.includes('هذا الشهر') || text.includes('الشهر')) {
          parameters.period = 'month';
        } else if (text.includes('هذا الأسبوع') || text.includes('الأسبوع')) {
          parameters.period = 'week';
        } else if (text.includes('اليوم')) {
          parameters.period = 'day';
        } else {
          parameters.period = 'month'; // الافتراضي
        }
        break;

      case CommandType.SALES_THIS_MONTH:
        parameters.period = 'month';
        break;

      case CommandType.SALES_TODAY:
        parameters.period = 'day';
        break;
    }

    return parameters;
  }

  /**
   * الحصول على وصف الأمر بالعربية
   */
  static getCommandDescription(type: CommandType): string {
    const descriptions: Record<CommandType, string> = {
      [CommandType.SALES_TODAY]: 'عرض مبيعات اليوم',
      [CommandType.SALES_THIS_MONTH]: 'عرض مبيعات هذا الشهر',
      [CommandType.TOP_CUSTOMERS]: 'عرض أعلى العملاء',
      [CommandType.UNPAID_INVOICES]: 'عرض الفواتير غير المدفوعة',
      [CommandType.LOW_STOCK]: 'عرض المنتجات منخفضة المخزون',
      [CommandType.CREATE_QUOTE]: 'إنشاء عرض سعر جديد',
      [CommandType.CUSTOMER_INFO]: 'عرض معلومات العميل',
      [CommandType.INVOICE_DETAILS]: 'عرض تفاصيل الفاتورة',
      [CommandType.PRODUCT_INFO]: 'عرض معلومات المنتج',
      [CommandType.UNKNOWN]: 'أمر غير مفهوم',
    };

    return descriptions[type] || 'أمر غير معروف';
  }

  /**
   * الحصول على رسالة الخطأ بالعربية
   */
  static getErrorMessage(type: CommandType): string {
    if (type === CommandType.UNKNOWN) {
      return 'لم أفهم الأمر. يرجى المحاولة مرة أخرى بصيغة مختلفة.';
    }
    return 'حدث خطأ في معالجة الأمر.';
  }
}
