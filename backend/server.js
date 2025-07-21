const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// مسیر فایل‌ها
const TARGET_DIR = 'C:/Users/Administrator/Downloads/IYXWEB';
const ORDERS_FILE = path.join(TARGET_DIR, 'orders.log');
const LATEST_ORDER_FILE = path.join(TARGET_DIR, 'latest_order.json');

// اگر فولدر وجود نداره، بسازش
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// کانکشن به دیتابیس MongoDB
mongoose.connect('mongodb://localhost:27017/iyxproject', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// مدل محصول
const productSchema = new mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  image: String,
});
const Product = mongoose.model('Product', productSchema);

// مدل سفارش
const orderSchema = new mongoose.Schema({
  orderCode: String,
  discordTag: String,
  discordId: String,
  product: {
    id: String,
    name: String,
    price: Number,
    image: String,
  },
  createdAt: { type: Date, default: Date.now },
});
const Order = mongoose.model('Order', orderSchema);

app.use(express.json());

// دریافت لیست محصولات برای فرانت‌اند
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: '❌ خطا در خواندن محصولات!' });
  }
});

// افزودن محصول جدید (API مخصوص ادمین)
app.post('/add-product', async (req, res) => {
  const { name, price, image } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: '❌ نام یا قیمت وارد نشده!' });
  }
  const id = Date.now().toString();
  const newProduct = new Product({ id, name, price, image: image || '' });
  try {
    await newProduct.save();
    res.json({ message: '✅ محصول با موفقیت افزوده شد!', product: newProduct });
  } catch (err) {
    res.status(500).json({ message: '❌ خطا در افزودن محصول!' });
  }
});

// ثبت سفارش جدید
app.post('/order', async (req, res) => {
  const { discordId, discordTag, productId } = req.body;
  if (!discordId || !discordTag || !productId) {
    return res.status(400).json({ message: '❌ اطلاعات سفارش ناقص است!' });
  }
  const product = await Product.findOne({ id: productId });
  if (!product) return res.status(404).json({ message: '❌ محصول یافت نشد.' });

  const orderCode = `IYX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  const order = new Order({
    orderCode,
    discordTag,
    discordId,
    product,
  });

  try {
    await order.save();

    // ذخیره سفارش در فایل orders.log
    const logLine = `${orderCode} | ${discordTag} | ${product.name} | ${discordId}\n`;
    fs.appendFileSync(ORDERS_FILE, logLine);

    // ذخیره آخرین سفارش در latest_order.json
    fs.writeFileSync(
      LATEST_ORDER_FILE,
      JSON.stringify({
        orderCode,
        discordTag,
        discordId,
        product,
        createdAt: order.createdAt,
      }, null, 2)
    );

    res.json({ message: `✅ سفارش ثبت شد! کد سفارش شما: ${orderCode}`, orderCode });
  } catch (err) {
    res.status(500).json({ message: '❌ خطا در ثبت سفارش!' });
  }
});

// راهنمای ساده سایت
app.get('/help', (req, res) => {
  res.json({
    message: 
      "ℹ️ راهنمای استفاده:\n" +
      "🛒 دریافت محصولات: GET /products\n" +
      "➕ افزودن محصول: POST /add-product\n" +
      "📦 ثبت سفارش: POST /order\n"
  });
});

app.listen(PORT, () => console.log(`🌐 Backend API running on port ${PORT}`));
