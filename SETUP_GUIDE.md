# دليل الإعدادات - Malaz

## المفاتيح والإعدادات المستخدمة

### Odoo Configuration
```
Server URL: https://brodansh.de.com.eg
API Key: 0c8f8dc571270dc15ad8e6ac8e3622f5f80f8ed6
```

### OpenAI Configuration
```
API Key: sk-proj-pxEa-QQG_EY5beCsdniAatJdigAKila1jQBEcq516MGEEh8_kPZEoaVahJzO8VPKutMQtK_QY5T3BlbkFJf4b51ZxqnyOARPkcyUSzgibs8TJGPK5tuSnrvCI0faCDlsQAdNXHekl24nbnC
```

## متغيرات البيئة

تم تعيين المتغيرات التالية في البيئة:

```bash
ODOO_SERVER_URL=https://brodansh.de.com.eg
ODOO_API_KEY=0c8f8dc571270dc15ad8e6ac8e3622f5f80f8ed6
OPENAI_API_KEY=sk-proj-pxEa-QQG_EY5beCsdniAatJdigAKila1jQBEcq516MGEEh8_kPZEoaVahJzO8VPKutMQtK_QY5T3BlbkFJf4b51ZxqnyOARPkcyUSzgibs8TJGPK5tuSnrvCI0faCDlsQAdNXHekl24nbnC
```

## الخدمات المدمجة

### 1. VoiceService
- التعرف على الصوت باللغة العربية
- تحويل الصوت إلى نص (Speech to Text)
- تحويل النص إلى صوت (Text to Speech)
- معالجة الأخطاء والاستثناءات

### 2. CommandParser
- تحليل الأوامر الصوتية
- استخراج المعاملات والبيانات
- دعم الأوامر المتقدمة
- معالجة الأوامر غير المفهومة

### 3. OdooService
- الاتصال بـ Odoo عبر JSON-RPC
- استعلامات المبيعات والفواتير
- إدارة العملاء والمنتجات
- تخزين الجلسات

### 4. OpenAIService
- تحليل الأوامر الذكي
- تصحيح النصوص العربية
- استخراج المعاملات المتقدم
- توليد الردود الذكية

## البنية المعمارية

```
Malaz App
├── Voice Input (Microphone)
│   └── VoiceService
│       └── Speech to Text (Arabic)
│
├── Command Processing
│   ├── CommandParser (Pattern Matching)
│   └── OpenAI Service (Smart Analysis)
│
├── Backend Integration
│   └── OdooService
│       ├── Sales Queries
│       ├── Invoice Management
│       ├── Customer Data
│       └── Inventory Tracking
│
└── Voice Output
    └── Text to Speech (Arabic)
```

## الأذونات المطلوبة

- `RECORD_AUDIO`: للتعرف على الصوت
- `INTERNET`: للاتصال بـ Odoo و OpenAI
- `READ_EXTERNAL_STORAGE`: لقراءة الملفات (اختياري)
- `WRITE_EXTERNAL_STORAGE`: لكتابة السجلات (اختياري)

## اختبار الاتصالات

تم تشغيل الاختبارات التالية بنجاح:
- ✅ اتصال Odoo Server
- ✅ صحة مفتاح OpenAI API
- ✅ جودة الاتصال بالإنترنت

## الملفات الرئيسية

```
lib/
├── services/
│   ├── voice-service.ts          # خدمة الصوت
│   ├── command-parser.ts         # محلل الأوامر
│   ├── odoo-service.ts           # خدمة Odoo
│   └── openai-service.ts         # خدمة OpenAI
│
├── context/
│   └── voice-command-context.tsx # إدارة الحالة
│
└── types/
    └── react-native-voice.d.ts   # تعريفات الأنواع

app/
├── (tabs)/
│   ├── index.tsx                 # الشاشة الرئيسية
│   └── voice-commands.tsx        # شاشة الأوامر الصوتية
│
└── _layout.tsx                   # التخطيط الرئيسي
```

## الخطوات التالية

1. **تثبيت التطبيق**: قم بتثبيت ملف APK على هاتفك
2. **التحقق من الأذونات**: تأكد من تفعيل أذونات الميكروفون
3. **اختبار الاتصال**: تحقق من الاتصال بـ Odoo
4. **تجربة الأوامر**: ابدأ باستخدام الأوامر الصوتية

## استكشاف الأخطاء

### خطأ: "لم يتم العثور على الخادم"
- تحقق من عنوان الخادم
- تأكد من الاتصال بالإنترنت
- جرب إعادة تشغيل التطبيق

### خطأ: "مفتاح API غير صحيح"
- تحقق من مفتاح OpenAI
- تأكد من عدم انتهاء صلاحية المفتاح
- تحقق من حسابك على OpenAI

### خطأ: "لم يتم التعرف على الأمر"
- تحدث بوضوح أكثر
- جرب أمر مختلف
- تأكد من أن اللغة مضبوطة على العربية

---

**آخر تحديث**: 13 فبراير 2026
**الإصدار**: 1.0.0
