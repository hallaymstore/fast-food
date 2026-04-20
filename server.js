require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

const app = express();

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kardeshler_doner";
const JWT_SECRET = process.env.JWT_SECRET || "kardeshler-super-secret";
const BRAND_NAME = process.env.BRAND_NAME || "Kardeshler Doner";

const CLOUDINARY_ENABLED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const uploadDirectory = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  express.static(path.join(__dirname, "public"), {
    etag: true,
    maxAge: "7d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
        return;
      }
      if (
        filePath.includes(`${path.sep}assets${path.sep}`) ||
        filePath.includes(`${path.sep}foodwagon-v1.0.0${path.sep}`)
      ) {
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      }
    },
  }),
);

const adminCardInfo = {
  cardNumber: process.env.ADMIN_CARD_NUMBER || "8600 1234 5678 9012",
  cardHolder: process.env.ADMIN_CARD_HOLDER || "KARDESHLER DONER MCHJ",
  bankName: process.env.ADMIN_BANK_NAME || "Agrobank",
  note:
    process.env.ADMIN_CARD_NOTE ||
    "To'lovdan keyin screenshotni yuklang. Admin tasdiqlagach buyurtma tayyorlanadi.",
};

const SETTINGS_DOC_KEY = "main";
const DEFAULT_LOGO_URL = "/foodwagon-v1.0.0/public/assets/img/logo.png";
const DEFAULT_FAVICON_URL =
  "/foodwagon-v1.0.0/public/assets/img/favicons/favicon-32x32.png";

function getDefaultSiteSettings() {
  return {
    brand: {
      name: BRAND_NAME,
      slogan: "Tez yetkazib berish, premium ta'm, zamonaviy servis",
      supportPhone: process.env.SUPPORT_PHONE || "+998 90 777 55 44",
      supportTelegram: process.env.SUPPORT_TELEGRAM || "@kardeshler_support",
      logoUrl: DEFAULT_LOGO_URL,
      logoDarkUrl: DEFAULT_LOGO_URL,
      faviconUrl: DEFAULT_FAVICON_URL,
      logoPublicId: "",
      logoDarkPublicId: "",
      faviconPublicId: "",
    },
    adminCard: { ...adminCardInfo },
    deliveryServices: [
      { key: "internal", name: "Kardeshler Express", eta: "20-35 daqiqa" },
      { key: "partner", name: "Hamkor kuryer", eta: "30-45 daqiqa" },
    ],
    offlineService: {
      enabled: true,
      workingHours: "10:00 - 23:00",
      address: "Toshkent shahri, Chilonzor tumani, Bunyodkor ko'chasi 17",
      mapEmbedUrl:
        "https://www.google.com/maps?q=41.2995,69.2401&z=14&output=embed",
      mapLink: "https://maps.google.com/?q=41.2995,69.2401",
      reservationSlots: [
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
        "21:00",
        "22:00",
      ],
    },
    landing: {
      badge: "foodwagon-v1.0.0 premium integrated",
      heroTitle: "Kardeshler Doner",
      heroSubtitle: "Tez yetkazib berish, premium ta'm, zamonaviy servis",
      quickOrderPlaceholder: "Tez buyurtma uchun manzil kiriting",
      ctaMenuText: "Menu ko'rish",
      ctaOrderText: "Hozir buyurtma",
      ctaTableText: "Stol bron qilish",
      feature1Title: "Tezkor buyurtma",
      feature1Description:
        "Menu tanlang, 1 klikda savatga qo'shing, to'lovni screenshot bilan tasdiqlang.",
      feature2Title: "To'liq nazorat",
      feature2Description:
        "Admin panelda users, menu, orders, delivery va offline stollar nazorati.",
      feature3Title: "Cloudinary media",
      feature3Description: "To'lov screenshotlari va rasmlar xavfsiz saqlanadi.",
      feature4Title: "Day/Night mode",
      feature4Description:
        "Kunduzgi va tungi premium temalar barcha qurilmalarda mos.",
      whyChooseTitle: "Nega bizni tanlashadi?",
      featuredTitle: "Featured Menu",
      processTitle: "Buyurtma jarayoni",
      processStep1Title: "Menu tanlang",
      processStep1Description:
        "Taomlarni kategoriya bo'yicha tanlang va savatga qo'shing.",
      processStep2Title: "Login/Register",
      processStep2Description:
        "Buyurtma berishda tizim login/register so'raydi va jarayonni davom ettiradi.",
      processStep3Title: "To'lov va tasdiq",
      processStep3Description:
        "Admin karta orqali to'lab screenshot yuborasiz, admin tasdiqlaydi.",
      paymentBannerTitle:
        "Admin kartaga to'lang, screenshot yuklang, tez tasdiq oling.",
      paymentBannerText:
        "Buyurtmangiz tasdiqlangach tayyorlash va delivery bosqichlari realtime status bilan ko'rinadi.",
      paymentBannerButtonText: "To'lov bo'limiga o'tish",
      offlineTitle: "Offline xizmat ham mavjud",
      offlineDescription:
        "Restoranga kelishdan oldin stol band qiling: bo'sh stollar yashil, bandlari qizil ko'rsatiladi.",
      offlineButtonText: "Stol bron sahifasiga o'tish",
      testimonialsTitle: "Mijozlar fikri",
      testimonial1Quote:
        "\"Buyurtma jarayoni juda sodda, to'lov tasdiqi ham tez bo'ldi.\"",
      testimonial1Author: "- Diyor, Toshkent",
      testimonial2Quote:
        "\"Stol bron funksiyasi juda qulay, restoranga borganimizda joy tayyor edi.\"",
      testimonial2Author: "- Maftuna, Chilonzor",
      testimonial3Quote:
        "\"Admin panel orqali hammasi nazoratda, biznes uchun zo'r yechim.\"",
      testimonial3Author: "- Komil, Manager",
      testimonial4Quote:
        "\"Mobil versiya ham juda qulay ishlaydi, pastki menu zo'r.\"",
      testimonial4Author: "- Shahzod, Yunusobod",
    },
    footer: {
      title: "Kardeshler Doner",
      legalLine: "Barcha huquqlar himoyalangan.",
      description:
        "Node.js + MongoDB + Cloudinary asosidagi premium fast-food platforma.",
      address: "Toshkent shahri, Chilonzor tumani, Bunyodkor ko'chasi 17",
      phone: process.env.SUPPORT_PHONE || "+998 90 777 55 44",
      email: process.env.ADMIN_EMAIL || "admin@kardeshler.uz",
      telegram: process.env.SUPPORT_TELEGRAM || "@kardeshler_support",
      mapEmbedUrl:
        "https://www.google.com/maps?q=41.2995,69.2401&z=14&output=embed",
      mapLink: "https://maps.google.com/?q=41.2995,69.2401",
    },
  };
}

const objectId = mongoose.Schema.Types.ObjectId;

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    address: { type: String, default: "", trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    avatarUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, default: "Doner", trim: true },
    price: { type: Number, required: true, min: 0 },
    imageUrl: {
      type: String,
      default: "/foodwagon-v1.0.0/public/assets/img/gallery/burger.png",
    },
    cloudinaryPublicId: { type: String, default: "" },
    spicyLevel: { type: String, default: "Oddiy", trim: true },
    prepTime: { type: Number, default: 12, min: 1 },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: objectId, ref: "MenuItem", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: "" },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: objectId, ref: "User", required: true, index: true },
    customerSnapshot: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        "new",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "new",
      index: true,
    },
    customerNote: { type: String, default: "", trim: true },
    payment: {
      method: { type: String, default: "admin_card" },
      status: {
        type: String,
        enum: ["not_submitted", "pending", "approved", "rejected"],
        default: "not_submitted",
        index: true,
      },
      proofUrl: { type: String, default: "" },
      proofPublicId: { type: String, default: "" },
      note: { type: String, default: "", trim: true },
      rejectReason: { type: String, default: "", trim: true },
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewedBy: { type: objectId, ref: "User" },
    },
    delivery: {
      type: {
        type: String,
        enum: ["courier", "pickup"],
        default: "courier",
      },
      service: {
        type: String,
        enum: ["internal", "partner"],
        default: "internal",
      },
      riderName: { type: String, default: "", trim: true },
      riderPhone: { type: String, default: "", trim: true },
      etaMinutes: { type: Number, default: 35, min: 0 },
      trackingCode: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

const tableSpotSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true, min: 1 },
    label: { type: String, default: "", trim: true },
    capacity: { type: Number, default: 4, min: 1 },
    zone: { type: String, default: "Asosiy zal", trim: true },
    x: { type: Number, default: 0.05, min: 0, max: 0.95 },
    y: { type: Number, default: 0.08, min: 0, max: 0.95 },
    width: { type: Number, default: 0.18, min: 0.08, max: 0.4 },
    height: { type: Number, default: 0.18, min: 0.08, max: 0.4 },
    shape: { type: String, enum: ["rect", "round"], default: "rect" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const tableReservationSchema = new mongoose.Schema(
  {
    reservationCode: { type: String, required: true, unique: true, index: true },
    table: { type: objectId, ref: "TableSpot", required: true, index: true },
    user: { type: objectId, ref: "User", required: true, index: true },
    customerSnapshot: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
    },
    visitDate: { type: String, required: true, trim: true }, // YYYY-MM-DD
    visitTime: { type: String, required: true, trim: true }, // HH:mm
    guestCount: { type: Number, required: true, min: 1, max: 20 },
    note: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending",
      index: true,
    },
    adminNote: { type: String, default: "", trim: true },
    reviewedBy: { type: objectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

tableReservationSchema.index({ table: 1, visitDate: 1, visitTime: 1, status: 1 });
tableReservationSchema.index({ createdAt: -1 });

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: SETTINGS_DOC_KEY },
    brand: { type: Object, default: {} },
    adminCard: { type: Object, default: {} },
    deliveryServices: { type: Array, default: [] },
    offlineService: { type: Object, default: {} },
    landing: { type: Object, default: {} },
    footer: { type: Object, default: {} },
  },
  { timestamps: true, minimize: false },
);

const User = mongoose.model("User", userSchema);
const MenuItem = mongoose.model("MenuItem", menuItemSchema);
const Order = mongoose.model("Order", orderSchema);
const TableSpot = mongoose.model("TableSpot", tableSpotSchema);
const TableReservation = mongoose.model("TableReservation", tableReservationSchema);
const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);

const orderStatuses = [
  "new",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

function sanitizeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    address: user.address,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function signToken(user) {
  return jwt.sign({ id: String(user._id), role: user.role }, JWT_SECRET, {
    expiresIn: "10d",
  });
}

function generateOrderNumber() {
  const shortTs = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `KD-${shortTs}${rand}`;
}

function generateReservationCode() {
  const shortTs = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `TB-${shortTs}${rand}`;
}

function normalizePhone(phone) {
  return String(phone || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

function normalizeVisitDate(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const clean = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }
  return new Date().toISOString().slice(0, 10);
}

function normalizeVisitTime(value) {
  const clean = String(value || "19:00").slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(clean)) {
    return clean;
  }
  return "19:00";
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return fallback;
}

function cleanText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim();
}

function cleanUrl(value, fallback = "") {
  const resolved = cleanText(value, "");
  if (!resolved) return fallback;
  if (resolved.startsWith("/") || /^https?:\/\//i.test(resolved)) {
    return resolved;
  }
  return fallback;
}

function normalizeReservationSlots(value, fallback = []) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const deduped = [];

  for (const item of source) {
    const candidate = String(item || "").trim().slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(candidate)) continue;
    if (!deduped.includes(candidate)) {
      deduped.push(candidate);
    }
  }

  return deduped.length ? deduped : fallback;
}

function normalizeDeliveryServices(value, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  const result = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const key = cleanText(item.key, "").toLowerCase();
    const name = cleanText(item.name, "");
    const eta = cleanText(item.eta, "");
    if (!key || !name) continue;
    result.push({ key, name, eta });
  }
  return result.length ? result : fallback;
}

function deepMerge(base, patch) {
  if (Array.isArray(base)) {
    return Array.isArray(patch) ? patch : [...base];
  }
  if (!base || typeof base !== "object") {
    return patch === undefined ? base : patch;
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return { ...base };
  }

  const merged = { ...base };
  for (const key of Object.keys(patch)) {
    if (!(key in base)) continue;
    const baseValue = base[key];
    const patchValue = patch[key];

    if (
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue) &&
      patchValue &&
      typeof patchValue === "object" &&
      !Array.isArray(patchValue)
    ) {
      merged[key] = deepMerge(baseValue, patchValue);
    } else if (patchValue !== undefined) {
      merged[key] = patchValue;
    }
  }
  return merged;
}

function normalizeSettingsShape(rawSettings) {
  const defaults = getDefaultSiteSettings();
  const merged = deepMerge(defaults, rawSettings || {});

  merged.brand.name = cleanText(merged.brand.name, defaults.brand.name);
  merged.brand.slogan = cleanText(merged.brand.slogan, defaults.brand.slogan);
  merged.brand.supportPhone = cleanText(
    merged.brand.supportPhone,
    defaults.brand.supportPhone,
  );
  merged.brand.supportTelegram = cleanText(
    merged.brand.supportTelegram,
    defaults.brand.supportTelegram,
  );
  merged.brand.logoUrl = cleanUrl(merged.brand.logoUrl, defaults.brand.logoUrl);
  merged.brand.logoDarkUrl = cleanUrl(
    merged.brand.logoDarkUrl,
    merged.brand.logoUrl || defaults.brand.logoDarkUrl,
  );
  merged.brand.faviconUrl = cleanUrl(
    merged.brand.faviconUrl,
    defaults.brand.faviconUrl,
  );
  merged.brand.logoPublicId = cleanText(merged.brand.logoPublicId, "");
  merged.brand.logoDarkPublicId = cleanText(merged.brand.logoDarkPublicId, "");
  merged.brand.faviconPublicId = cleanText(merged.brand.faviconPublicId, "");

  merged.adminCard.cardNumber = cleanText(
    merged.adminCard.cardNumber,
    defaults.adminCard.cardNumber,
  );
  merged.adminCard.cardHolder = cleanText(
    merged.adminCard.cardHolder,
    defaults.adminCard.cardHolder,
  );
  merged.adminCard.bankName = cleanText(
    merged.adminCard.bankName,
    defaults.adminCard.bankName,
  );
  merged.adminCard.note = cleanText(merged.adminCard.note, defaults.adminCard.note);

  merged.deliveryServices = normalizeDeliveryServices(
    merged.deliveryServices,
    defaults.deliveryServices,
  );

  merged.offlineService.enabled = parseBoolean(
    merged.offlineService.enabled,
    defaults.offlineService.enabled,
  );
  merged.offlineService.workingHours = cleanText(
    merged.offlineService.workingHours,
    defaults.offlineService.workingHours,
  );
  merged.offlineService.address = cleanText(
    merged.offlineService.address,
    defaults.offlineService.address,
  );
  merged.offlineService.mapEmbedUrl = cleanUrl(
    merged.offlineService.mapEmbedUrl,
    defaults.offlineService.mapEmbedUrl,
  );
  merged.offlineService.mapLink = cleanUrl(
    merged.offlineService.mapLink,
    defaults.offlineService.mapLink,
  );
  merged.offlineService.reservationSlots = normalizeReservationSlots(
    merged.offlineService.reservationSlots,
    defaults.offlineService.reservationSlots,
  );

  for (const key of Object.keys(defaults.landing)) {
    merged.landing[key] = cleanText(merged.landing[key], defaults.landing[key]);
  }

  for (const key of Object.keys(defaults.footer)) {
    if (key.toLowerCase().includes("url") || key.toLowerCase().includes("link")) {
      merged.footer[key] = cleanUrl(merged.footer[key], defaults.footer[key]);
      continue;
    }
    merged.footer[key] = cleanText(merged.footer[key], defaults.footer[key]);
  }

  return merged;
}

function toPublicSettings(normalized) {
  return {
    brand: {
      name: normalized.brand.name,
      slogan: normalized.brand.slogan,
      supportPhone: normalized.brand.supportPhone,
      supportTelegram: normalized.brand.supportTelegram,
      logoUrl: normalized.brand.logoUrl,
      logoDarkUrl: normalized.brand.logoDarkUrl,
      faviconUrl: normalized.brand.faviconUrl,
    },
    adminCard: normalized.adminCard,
    deliveryServices: normalized.deliveryServices,
    offlineService: normalized.offlineService,
    landing: normalized.landing,
    footer: normalized.footer,
  };
}

async function ensureSiteSettings() {
  await SiteSettings.findOneAndUpdate(
    { key: SETTINGS_DOC_KEY },
    {
      $setOnInsert: {
        key: SETTINGS_DOC_KEY,
        ...getDefaultSiteSettings(),
      },
    },
    { upsert: true, new: true },
  );
}

async function fetchNormalizedSiteSettings() {
  await ensureSiteSettings();
  const doc = await SiteSettings.findOne({ key: SETTINGS_DOC_KEY }).lean();
  const source = doc || getDefaultSiteSettings();
  return normalizeSettingsShape(source);
}

function calculateTotals(orderItems, deliveryType) {
  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = deliveryType === "pickup" ? 0 : 12000;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

function formatOrder(order) {
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    user: order.user,
    customerSnapshot: order.customerSnapshot,
    items: order.items,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    status: order.status,
    customerNote: order.customerNote,
    payment: order.payment,
    delivery: order.delivery,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

async function uploadImageFile(file, folderName) {
  if (!file) {
    return { url: "", publicId: "" };
  }

  if (CLOUDINARY_ENABLED) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: folderName, resource_type: "image" },
        (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(file.buffer);
    });
  }

  const extension =
    path.extname(file.originalname || "") ||
    (file.mimetype === "image/png" ? ".png" : ".jpg");
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
  const diskPath = path.join(uploadDirectory, fileName);
  fs.writeFileSync(diskPath, file.buffer);
  return { url: `/uploads/${fileName}`, publicId: "" };
}

async function removeCloudinaryAsset(publicId) {
  if (!publicId || !CLOUDINARY_ENABLED) {
    return;
  }
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary remove error:", error.message);
  }
}

async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [, token] = authHeader.split(" ");

    if (!token) {
      return res.status(401).json({ message: "Token kerak." });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Foydalanuvchi topilmadi." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Noto'g'ri yoki eskirgan token." });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Ushbu bo'lim faqat admin uchun." });
  }
  return next();
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    now: new Date().toISOString(),
    cloudinary: CLOUDINARY_ENABLED,
  });
});

app.get("/api/settings", async (req, res, next) => {
  try {
    const settings = await fetchNormalizedSiteSettings();
    res.json(toPublicSettings(settings));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { fullName, phone, password, email, address } = req.body || {};
    const normalizedPhone = normalizePhone(phone);

    if (!fullName || !normalizedPhone || !password) {
      return res
        .status(400)
        .json({ message: "Ism, telefon va parol majburiy." });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Parol kamida 6 belgidan iborat." });
    }

    const existing = await User.findOne({ phone: normalizedPhone });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Bu telefon raqam bilan akkaunt mavjud." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName: String(fullName).trim(),
      phone: normalizedPhone,
      passwordHash,
      email: email ? String(email).trim().toLowerCase() : "",
      address: address ? String(address).trim() : "",
      role: "user",
    });

    return res.status(201).json({
      token: signToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { phone, password } = req.body || {};
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || !password) {
      return res.status(400).json({ message: "Telefon va parol kiriting." });
    }

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Login yoki parol noto'g'ri." });
    }

    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) {
      return res.status(401).json({ message: "Login yoki parol noto'g'ri." });
    }

    return res.json({
      token: signToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/me", authRequired, (req, res) => {
  res.json(sanitizeUser(req.user));
});

app.put("/api/me", authRequired, async (req, res, next) => {
  try {
    const { fullName, email, address, currentPassword, newPassword } =
      req.body || {};

    if (fullName) req.user.fullName = String(fullName).trim();
    if (typeof email === "string") req.user.email = email.trim().toLowerCase();
    if (typeof address === "string") req.user.address = address.trim();

    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ message: "Yangi parol uchun joriy parol ham kerak." });
      }
      const matched = await bcrypt.compare(currentPassword, req.user.passwordHash);
      if (!matched) {
        return res.status(400).json({ message: "Joriy parol noto'g'ri." });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ message: "Yangi parol juda qisqa." });
      }
      req.user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await req.user.save();
    res.json(sanitizeUser(req.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/menu/categories", async (req, res, next) => {
  try {
    const categories = await MenuItem.distinct("category");
    res.json(["Barchasi", ...categories.filter(Boolean)]);
  } catch (error) {
    next(error);
  }
});

app.get("/api/menu", async (req, res, next) => {
  try {
    const { category, q, available, featured, limit } = req.query;
    const filter = {};

    if (category && category !== "Barchasi") {
      filter.category = category;
    }
    if (q) {
      const regex = new RegExp(String(q), "i");
      filter.$or = [{ name: regex }, { description: regex }, { tags: regex }];
    }
    if (typeof available !== "undefined") {
      filter.isAvailable = String(available).toLowerCase() === "true";
    }
    if (typeof featured !== "undefined") {
      filter.isFeatured = String(featured).toLowerCase() === "true";
    }

    const parsedLimit = Math.min(Number(limit) || 120, 200);
    const items = await MenuItem.find(filter)
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(parsedLimit);

    res.json(items);
  } catch (error) {
    next(error);
  }
});

app.get("/api/menu/:id", async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Menu topilmadi." });
    }
    return res.json(item);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/orders", authRequired, async (req, res, next) => {
  try {
    const { items, deliveryType, deliveryService, deliveryAddress, customerNote } =
      req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Kamida bitta taom tanlang." });
    }

    const uniqueIds = [...new Set(items.map((i) => String(i.menuItemId || "")))];
    const menuItems = await MenuItem.find({
      _id: { $in: uniqueIds },
      isAvailable: true,
    });

    const menuMap = new Map(menuItems.map((item) => [String(item._id), item]));
    const preparedItems = [];

    for (const cartItem of items) {
      const menuItem = menuMap.get(String(cartItem.menuItemId || ""));
      if (!menuItem) continue;

      const quantity = Math.max(1, Math.min(Number(cartItem.quantity) || 1, 30));
      const lineTotal = quantity * menuItem.price;
      preparedItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        lineTotal,
        imageUrl: menuItem.imageUrl,
      });
    }

    if (preparedItems.length === 0) {
      return res.status(400).json({ message: "Tanlangan taomlar topilmadi." });
    }

    const resolvedDeliveryType = deliveryType === "pickup" ? "pickup" : "courier";
    const resolvedService =
      deliveryService === "partner" ? "partner" : "internal";

    const totals = calculateTotals(preparedItems, resolvedDeliveryType);
    const safeAddress =
      (deliveryAddress && String(deliveryAddress).trim()) || req.user.address;

    if (!safeAddress && resolvedDeliveryType === "courier") {
      return res.status(400).json({ message: "Yetkazib berish manzilini kiriting." });
    }

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.user._id,
      customerSnapshot: {
        fullName: req.user.fullName,
        phone: req.user.phone,
        address: safeAddress || "Pickup buyurtma",
      },
      items: preparedItems,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      customerNote: customerNote ? String(customerNote).trim() : "",
      payment: {
        method: "admin_card",
        status: "not_submitted",
      },
      delivery: {
        type: resolvedDeliveryType,
        service: resolvedService,
        etaMinutes: resolvedDeliveryType === "pickup" ? 10 : 35,
      },
    });

    return res.status(201).json(formatOrder(order));
  } catch (error) {
    return next(error);
  }
});

app.get("/api/orders/my", authRequired, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders.map(formatOrder));
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders/:id", authRequired, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "fullName phone role")
      .populate("payment.reviewedBy", "fullName");

    if (!order) {
      return res.status(404).json({ message: "Buyurtma topilmadi." });
    }

    const isOwner = String(order.user._id || order.user) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Bu buyurtmaga kirishga ruxsat yo'q." });
    }

    return res.json(formatOrder(order));
  } catch (error) {
    return next(error);
  }
});

async function getBusyTableMap(visitDate, visitTime) {
  const busyReservations = await TableReservation.find({
    visitDate,
    visitTime,
    status: { $in: ["pending", "approved"] },
  }).select("table status");

  return busyReservations.reduce((acc, reservation) => {
    acc[String(reservation.table)] = {
      status: reservation.status,
      reservationId: reservation._id,
    };
    return acc;
  }, {});
}

app.get("/api/tables", async (req, res, next) => {
  try {
    const visitDate = normalizeVisitDate(req.query.date);
    const visitTime = normalizeVisitTime(req.query.time);

    const [tables, busyMap] = await Promise.all([
      TableSpot.find({ isActive: true }).sort({ number: 1 }),
      getBusyTableMap(visitDate, visitTime),
    ]);

    const result = tables.map((table) => {
      const busy = busyMap[String(table._id)];
      return {
        ...table.toObject(),
        occupancyStatus: busy ? "busy" : "available",
        occupancyDetail: busy || null,
      };
    });

    res.json({
      visitDate,
      visitTime,
      tables: result,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/tables/reservations", authRequired, async (req, res, next) => {
  try {
    const { tableId, visitDate, visitTime, guestCount, note } = req.body || {};
    if (!tableId) {
      return res.status(400).json({ message: "Stolni tanlang." });
    }

    const normalizedDate = normalizeVisitDate(visitDate);
    const normalizedTime = normalizeVisitTime(visitTime);
    const guests = Math.max(1, Math.min(Number(guestCount) || 1, 20));

    const table = await TableSpot.findById(tableId);
    if (!table || !table.isActive) {
      return res.status(404).json({ message: "Stol topilmadi." });
    }
    if (guests > Number(table.capacity || 4)) {
      return res.status(400).json({
        message: `Tanlangan stol maksimal ${table.capacity} kishiga mo'ljallangan.`,
      });
    }

    const alreadyBooked = await TableReservation.findOne({
      table: table._id,
      visitDate: normalizedDate,
      visitTime: normalizedTime,
      status: { $in: ["pending", "approved"] },
    });
    if (alreadyBooked) {
      return res
        .status(409)
        .json({ message: "Ushbu vaqt uchun stol allaqachon band qilingan." });
    }

    const reservation = await TableReservation.create({
      reservationCode: generateReservationCode(),
      table: table._id,
      user: req.user._id,
      customerSnapshot: {
        fullName: req.user.fullName,
        phone: req.user.phone,
      },
      visitDate: normalizedDate,
      visitTime: normalizedTime,
      guestCount: guests,
      note: note ? String(note).trim() : "",
      status: "pending",
    });

    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
});

app.get("/api/tables/my-reservations", authRequired, async (req, res, next) => {
  try {
    const reservations = await TableReservation.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("table", "number label capacity zone");
    res.json(reservations);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/orders/:id/payment-proof",
  authRequired,
  upload.single("screenshot"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Screenshot faylini yuklang (jpg/png)." });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Buyurtma topilmadi." });
      }
      if (String(order.user) !== String(req.user._id)) {
        return res
          .status(403)
          .json({ message: "Faqat o'zingizning buyurtmangizga to'lov yuboring." });
      }
      if (order.payment.status === "approved") {
        return res
          .status(400)
          .json({ message: "Bu buyurtma to'lovi allaqachon tasdiqlangan." });
      }

      const previousPublicId = order.payment.proofPublicId;
      const uploadResult = await uploadImageFile(
        req.file,
        "kardeshler-doner/payment-proofs",
      );

      order.payment.proofUrl = uploadResult.url;
      order.payment.proofPublicId = uploadResult.publicId;
      order.payment.note = req.body.note ? String(req.body.note).trim() : "";
      order.payment.submittedAt = new Date();
      order.payment.status = "pending";
      order.payment.rejectReason = "";
      order.payment.reviewedAt = undefined;
      order.payment.reviewedBy = undefined;

      await order.save();
      await removeCloudinaryAsset(previousPublicId);

      return res.json(formatOrder(order));
    } catch (error) {
      return next(error);
    }
  },
);

app.get("/api/dashboard/me", authRequired, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    const counters = {
      total: orders.length,
      pendingPayment: 0,
      preparing: 0,
      outForDelivery: 0,
      delivered: 0,
    };
    let spent = 0;

    for (const order of orders) {
      if (order.payment.status === "pending") counters.pendingPayment += 1;
      if (["confirmed", "preparing"].includes(order.status)) counters.preparing += 1;
      if (order.status === "out_for_delivery") counters.outForDelivery += 1;
      if (order.status === "delivered") {
        counters.delivered += 1;
        spent += order.total;
      }
    }

    res.json({
      counters,
      spent,
      recent: orders.slice(0, 6).map(formatOrder),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/overview", authRequired, adminRequired, async (req, res, next) => {
  try {
    const [users, menuItems, orders, pendingPayments, revenueAgg, tableSpots, pendingTableReservations] = await Promise.all([
      User.countDocuments(),
      MenuItem.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ "payment.status": "pending" }),
      Order.aggregate([
        { $match: { status: "delivered", "payment.status": "approved" } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]),
      TableSpot.countDocuments({ isActive: true }),
      TableReservation.countDocuments({ status: "pending" }),
    ]);

    const groupedStatuses = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusSummary = orderStatuses.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {});
    for (const item of groupedStatuses) {
      statusSummary[item._id] = item.count;
    }

    res.json({
      users,
      menuItems,
      orders,
      pendingPayments,
      totalRevenue: revenueAgg[0]?.totalRevenue || 0,
      statusSummary,
      tableSpots,
      pendingTableReservations,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/users", authRequired, adminRequired, async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const spendAgg = await Order.aggregate([
      { $group: { _id: "$user", orderCount: { $sum: 1 }, totalSpent: { $sum: "$total" } } },
    ]);
    const spendMap = new Map(spendAgg.map((item) => [String(item._id), item]));

    const result = users.map((user) => {
      const stats = spendMap.get(String(user._id));
      return {
        ...sanitizeUser(user),
        orderCount: stats?.orderCount || 0,
        totalSpent: stats?.totalSpent || 0,
      };
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/users/:id", authRequired, adminRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi." });

    if (typeof req.body.role === "string" && ["user", "admin"].includes(req.body.role)) {
      user.role = req.body.role;
    }
    if (typeof req.body.isActive !== "undefined") {
      user.isActive = parseBoolean(req.body.isActive, true);
    }

    await user.save();
    res.json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/tables", authRequired, adminRequired, async (req, res, next) => {
  try {
    const tables = await TableSpot.find().sort({ number: 1 });
    res.json(tables);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/tables", authRequired, adminRequired, async (req, res, next) => {
  try {
    const payload = req.body || {};
    if (typeof payload.number === "undefined") {
      return res.status(400).json({ message: "Stol raqami majburiy." });
    }
    const resolvedNumber = Math.max(1, Number(payload.number) || 1);
    const numberExists = await TableSpot.findOne({ number: resolvedNumber });
    if (numberExists) {
      return res.status(409).json({ message: "Bu raqamli stol allaqachon mavjud." });
    }
    const table = await TableSpot.create({
      number: resolvedNumber,
      label: payload.label ? String(payload.label).trim() : "",
      capacity: Math.max(1, Number(payload.capacity) || 4),
      zone: payload.zone ? String(payload.zone).trim() : "Asosiy zal",
      x: Math.max(0, Math.min(Number(payload.x) || 0.05, 0.95)),
      y: Math.max(0, Math.min(Number(payload.y) || 0.08, 0.95)),
      width: Math.max(0.08, Math.min(Number(payload.width) || 0.18, 0.4)),
      height: Math.max(0.08, Math.min(Number(payload.height) || 0.18, 0.4)),
      shape: payload.shape === "round" ? "round" : "rect",
      isActive: typeof payload.isActive === "undefined" ? true : parseBoolean(payload.isActive, true),
    });
    res.status(201).json(table);
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/tables/:id", authRequired, adminRequired, async (req, res, next) => {
  try {
    const table = await TableSpot.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: "Stol topilmadi." });
    }
    const payload = req.body || {};

    if (typeof payload.number !== "undefined") {
      const resolvedNumber = Math.max(1, Number(payload.number) || table.number);
      const duplicate = await TableSpot.findOne({
        _id: { $ne: table._id },
        number: resolvedNumber,
      });
      if (duplicate) {
        return res.status(409).json({ message: "Bu raqam boshqa stolga biriktirilgan." });
      }
      table.number = resolvedNumber;
    }
    if (typeof payload.label === "string") table.label = payload.label.trim();
    if (typeof payload.capacity !== "undefined") {
      table.capacity = Math.max(1, Number(payload.capacity) || table.capacity);
    }
    if (typeof payload.zone === "string") table.zone = payload.zone.trim();
    if (typeof payload.x !== "undefined") {
      table.x = Math.max(0, Math.min(Number(payload.x) || table.x, 0.95));
    }
    if (typeof payload.y !== "undefined") {
      table.y = Math.max(0, Math.min(Number(payload.y) || table.y, 0.95));
    }
    if (typeof payload.width !== "undefined") {
      table.width = Math.max(0.08, Math.min(Number(payload.width) || table.width, 0.4));
    }
    if (typeof payload.height !== "undefined") {
      table.height = Math.max(0.08, Math.min(Number(payload.height) || table.height, 0.4));
    }
    if (typeof payload.shape === "string") {
      table.shape = payload.shape === "round" ? "round" : "rect";
    }
    if (typeof payload.isActive !== "undefined") {
      table.isActive = parseBoolean(payload.isActive, true);
    }

    await table.save();
    res.json(table);
  } catch (error) {
    next(error);
  }
});

app.patch(
  "/api/admin/tables/layout",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const { tables } = req.body || {};
      if (!Array.isArray(tables)) {
        return res.status(400).json({ message: "`tables` massiv bo'lishi kerak." });
      }

      const bulkOps = [];
      for (const item of tables) {
        if (!item?.id) continue;
        bulkOps.push({
          updateOne: {
            filter: { _id: item.id },
            update: {
              $set: {
                x: Math.max(0, Math.min(Number(item.x) || 0, 0.95)),
                y: Math.max(0, Math.min(Number(item.y) || 0, 0.95)),
                width: Math.max(0.08, Math.min(Number(item.width) || 0.18, 0.4)),
                height: Math.max(0.08, Math.min(Number(item.height) || 0.18, 0.4)),
              },
            },
          },
        });
      }

      if (bulkOps.length) {
        await TableSpot.bulkWrite(bulkOps);
      }

      const refreshed = await TableSpot.find().sort({ number: 1 });
      res.json(refreshed);
    } catch (error) {
      next(error);
    }
  },
);

app.delete("/api/admin/tables/:id", authRequired, adminRequired, async (req, res, next) => {
  try {
    const table = await TableSpot.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: "Stol topilmadi." });
    }

    const lockedReservation = await TableReservation.findOne({
      table: table._id,
      status: { $in: ["pending", "approved"] },
    });
    if (lockedReservation) {
      return res.status(400).json({
        message: "Bu stol uchun faol rezervatsiya bor. Avval rezervatsiyani yakunlang.",
      });
    }

    await table.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/admin/tables/reservations",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.status) {
        filter.status = req.query.status;
      }
      const reservations = await TableReservation.find(filter)
        .sort({ createdAt: -1 })
        .populate("table", "number label capacity zone")
        .populate("user", "fullName phone")
        .populate("reviewedBy", "fullName");
      res.json(reservations);
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/tables/reservations/:id",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const reservation = await TableReservation.findById(req.params.id);
      if (!reservation) {
        return res.status(404).json({ message: "Rezervatsiya topilmadi." });
      }

      const { status, adminNote } = req.body || {};
      if (
        !["pending", "approved", "rejected", "cancelled", "completed"].includes(status)
      ) {
        return res.status(400).json({ message: "Noto'g'ri status qiymati." });
      }

      if (status === "approved") {
        const conflict = await TableReservation.findOne({
          _id: { $ne: reservation._id },
          table: reservation.table,
          visitDate: reservation.visitDate,
          visitTime: reservation.visitTime,
          status: { $in: ["pending", "approved"] },
        });
        if (conflict) {
          return res.status(409).json({
            message: "Bu stol va vaqt oralig'i boshqa rezervatsiya bilan band.",
          });
        }
      }

      reservation.status = status;
      reservation.adminNote = adminNote ? String(adminNote).trim() : "";
      reservation.reviewedBy = req.user._id;
      reservation.reviewedAt = new Date();
      await reservation.save();

      const populated = await TableReservation.findById(reservation._id)
        .populate("table", "number label capacity zone")
        .populate("user", "fullName phone")
        .populate("reviewedBy", "fullName");

      res.json(populated);
    } catch (error) {
      next(error);
    }
  },
);

app.get("/api/admin/orders", authRequired, adminRequired, async (req, res, next) => {
  try {
    const filter = {};
    const { status, paymentStatus } = req.query;
    if (status) filter.status = status;
    if (paymentStatus) filter["payment.status"] = paymentStatus;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "fullName phone")
      .populate("payment.reviewedBy", "fullName");

    res.json(orders.map(formatOrder));
  } catch (error) {
    next(error);
  }
});

app.patch(
  "/api/admin/orders/:id/status",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const { status } = req.body || {};
      if (!orderStatuses.includes(status)) {
        return res.status(400).json({ message: "Noto'g'ri status qiymati." });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Buyurtma topilmadi." });
      }

      order.status = status;
      await order.save();
      res.json(formatOrder(order));
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/orders/:id/payment",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Buyurtma topilmadi." });
      }

      const { action, rejectReason } = req.body || {};
      if (!["approve", "reject"].includes(action)) {
        return res
          .status(400)
          .json({ message: "action qiymati approve yoki reject bo'lishi kerak." });
      }

      if (action === "approve") {
        if (order.payment.status !== "pending" || !order.payment.proofUrl) {
          return res.status(400).json({
            message:
              "Tasdiqlash uchun avval foydalanuvchi screenshot yuborgan bo'lishi kerak.",
          });
        }
        order.payment.status = "approved";
        order.payment.rejectReason = "";
        order.payment.reviewedBy = req.user._id;
        order.payment.reviewedAt = new Date();
        if (order.status === "new") {
          order.status = "confirmed";
        }
      } else {
        order.payment.status = "rejected";
        order.payment.rejectReason = rejectReason
          ? String(rejectReason).trim()
          : "To'lov ma'lumoti to'liq emas.";
        order.payment.reviewedBy = req.user._id;
        order.payment.reviewedAt = new Date();
      }

      await order.save();
      res.json(formatOrder(order));
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/orders/:id/delivery",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Buyurtma topilmadi." });
      }

      const { type, service, riderName, riderPhone, etaMinutes, trackingCode } =
        req.body || {};

      if (type && ["courier", "pickup"].includes(type)) order.delivery.type = type;
      if (service && ["internal", "partner"].includes(service)) {
        order.delivery.service = service;
      }
      if (typeof riderName === "string") order.delivery.riderName = riderName.trim();
      if (typeof riderPhone === "string") {
        order.delivery.riderPhone = riderPhone.trim();
      }
      if (typeof etaMinutes !== "undefined") {
        order.delivery.etaMinutes = Math.max(0, Number(etaMinutes) || 0);
      }
      if (typeof trackingCode === "string") {
        order.delivery.trackingCode = trackingCode.trim();
      }

      await order.save();
      res.json(formatOrder(order));
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/admin/menu",
  authRequired,
  adminRequired,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { name, description, category, price, spicyLevel, prepTime, tags } =
        req.body || {};

      if (!name || typeof price === "undefined") {
        return res.status(400).json({ message: "Nomi va narxi majburiy." });
      }

      const imageResult = req.file
        ? await uploadImageFile(req.file, "kardeshler-doner/menu-items")
        : { url: req.body.imageUrl || "", publicId: "" };

      const menu = await MenuItem.create({
        name: String(name).trim(),
        description: description ? String(description).trim() : "",
        category: category ? String(category).trim() : "Doner",
        price: Number(price) || 0,
        imageUrl:
          imageResult.url || "/foodwagon-v1.0.0/public/assets/img/gallery/burger.png",
        spicyLevel: spicyLevel ? String(spicyLevel).trim() : "Oddiy",
        prepTime: Math.max(1, Number(prepTime) || 12),
        isAvailable: parseBoolean(req.body.isAvailable, true),
        isFeatured: parseBoolean(req.body.isFeatured, false),
        tags: typeof tags === "string" ? tags.split(",").map((t) => t.trim()) : [],
      });

      res.status(201).json(menu);
    } catch (error) {
      next(error);
    }
  },
);

app.put(
  "/api/admin/menu/:id",
  authRequired,
  adminRequired,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const menu = await MenuItem.findById(req.params.id);
      if (!menu) {
        return res.status(404).json({ message: "Menu topilmadi." });
      }

      if (typeof req.body.name === "string") menu.name = req.body.name.trim();
      if (typeof req.body.description === "string") {
        menu.description = req.body.description.trim();
      }
      if (typeof req.body.category === "string") {
        menu.category = req.body.category.trim();
      }
      if (typeof req.body.price !== "undefined") {
        menu.price = Math.max(0, Number(req.body.price) || 0);
      }
      if (typeof req.body.spicyLevel === "string") {
        menu.spicyLevel = req.body.spicyLevel.trim();
      }
      if (typeof req.body.prepTime !== "undefined") {
        menu.prepTime = Math.max(1, Number(req.body.prepTime) || 12);
      }
      if (typeof req.body.isAvailable !== "undefined") {
        menu.isAvailable = parseBoolean(req.body.isAvailable, true);
      }
      if (typeof req.body.isFeatured !== "undefined") {
        menu.isFeatured = parseBoolean(req.body.isFeatured, false);
      }
      if (typeof req.body.tags === "string") {
        menu.tags = req.body.tags.split(",").map((t) => t.trim());
      }
      if (typeof req.body.imageUrl === "string" && req.body.imageUrl.trim()) {
        menu.imageUrl = req.body.imageUrl.trim();
      }

      if (req.file) {
        const previousPublicId = menu.cloudinaryPublicId || "";
        const imageResult = await uploadImageFile(
          req.file,
          "kardeshler-doner/menu-items",
        );
        menu.imageUrl = imageResult.url;
        menu.cloudinaryPublicId = imageResult.publicId;
        await removeCloudinaryAsset(previousPublicId);
      }

      await menu.save();
      res.json(menu);
    } catch (error) {
      next(error);
    }
  },
);

app.delete(
  "/api/admin/menu/:id",
  authRequired,
  adminRequired,
  async (req, res, next) => {
    try {
      const menu = await MenuItem.findById(req.params.id);
      if (!menu) {
        return res.status(404).json({ message: "Menu topilmadi." });
      }

      const publicId = menu.cloudinaryPublicId || "";
      await menu.deleteOne();
      await removeCloudinaryAsset(publicId);

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);

app.get("/api/admin/settings", authRequired, adminRequired, async (req, res, next) => {
  try {
    const settings = await fetchNormalizedSiteSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/settings", authRequired, adminRequired, async (req, res, next) => {
  try {
    const current = await fetchNormalizedSiteSettings();
    const incoming = req.body && typeof req.body === "object" ? req.body : {};
    const merged = normalizeSettingsShape(deepMerge(current, incoming));

    await SiteSettings.findOneAndUpdate(
      { key: SETTINGS_DOC_KEY },
      { $set: { key: SETTINGS_DOC_KEY, ...merged } },
      { upsert: true, new: true },
    );

    res.json(merged);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/admin/settings/asset",
  authRequired,
  adminRequired,
  upload.single("asset"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Yuklash uchun rasm fayli kerak." });
      }

      const assetType = cleanText(req.body?.assetType, "");
      const settings = await fetchNormalizedSiteSettings();

      let previousPublicId = "";
      let patch = {};
      let folderName = "kardeshler-doner/branding";

      if (assetType === "logo") {
        previousPublicId = settings.brand.logoPublicId || "";
      } else if (assetType === "logoDark") {
        previousPublicId = settings.brand.logoDarkPublicId || "";
      } else if (assetType === "favicon") {
        previousPublicId = settings.brand.faviconPublicId || "";
      } else {
        return res.status(400).json({
          message: "assetType qiymati logo, logoDark yoki favicon bo'lishi kerak.",
        });
      }

      const uploadResult = await uploadImageFile(req.file, folderName);

      if (assetType === "logo") {
        patch = {
          brand: {
            logoUrl: uploadResult.url,
            logoPublicId: uploadResult.publicId,
          },
        };
      } else if (assetType === "logoDark") {
        patch = {
          brand: {
            logoDarkUrl: uploadResult.url,
            logoDarkPublicId: uploadResult.publicId,
          },
        };
      } else {
        patch = {
          brand: {
            faviconUrl: uploadResult.url,
            faviconPublicId: uploadResult.publicId,
          },
        };
      }

      const merged = normalizeSettingsShape(deepMerge(settings, patch));
      await SiteSettings.findOneAndUpdate(
        { key: SETTINGS_DOC_KEY },
        { $set: { key: SETTINGS_DOC_KEY, ...merged } },
        { upsert: true, new: true },
      );

      if (previousPublicId && previousPublicId !== uploadResult.publicId) {
        await removeCloudinaryAsset(previousPublicId);
      }

      return res.json(merged);
    } catch (error) {
      return next(error);
    }
  },
);

app.get(["/", "/index", "/index.html"], (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const standalonePages = [
  "menu",
  "order",
  "payment",
  "tables",
  "dashboard",
  "profile",
  "history",
  "admin",
];
for (const page of standalonePages) {
  app.get([`/${page}`, `/${page}.html`], (req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(__dirname, "public", `${page}.html`));
  });
}

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API endpoint topilmadi." });
  }
  return next();
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);
  if (res.headersSent) {
    return next(error);
  }
  return res.status(500).json({
    message: "Serverda xatolik yuz berdi.",
    detail: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

async function seedInitialData() {
  await ensureSiteSettings();

  const adminPhone = normalizePhone(process.env.ADMIN_PHONE || "+998900000000");
  const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";
  const adminName = process.env.ADMIN_NAME || "Kardeshler Super Admin";

  const adminExists = await User.findOne({ phone: adminPhone });
  if (!adminExists) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      fullName: adminName,
      phone: adminPhone,
      passwordHash: hash,
      role: "admin",
      address: "Toshkent shahar",
      email: process.env.ADMIN_EMAIL || "admin@kardeshler.uz",
    });
    console.log(`Seed admin created: ${adminPhone} / ${adminPassword}`);
  }

  const menuCount = await MenuItem.countDocuments();
  if (menuCount === 0) {
    const defaultMenu = [
      {
        name: "Kardeshler Classic Doner",
        description: "Mol go'shti, maxsus sous, yangi sabzavotlar.",
        category: "Doner",
        price: 36000,
        spicyLevel: "Oddiy",
        prepTime: 12,
        isFeatured: true,
        imageUrl: "/foodwagon-v1.0.0/public/assets/img/gallery/burger.png",
        tags: ["doner", "classic"],
      },
      {
        name: "Mega Lava Doner",
        description: "Achchiq sous, ikki qavat go'sht, cheddar pishloq.",
        category: "Doner",
        price: 48000,
        spicyLevel: "Achchiq",
        prepTime: 14,
        isFeatured: true,
        imageUrl: "/foodwagon-v1.0.0/public/assets/img/gallery/crispy-sandwitch.png",
        tags: ["achchiq", "lava"],
      },
      {
        name: "Chicken Doner Roll",
        description: "Tovuq filesi, smokey sous, qizil karam.",
        category: "Roll",
        price: 32000,
        spicyLevel: "Yengil",
        prepTime: 10,
        isFeatured: true,
        imageUrl: "/foodwagon-v1.0.0/public/assets/img/gallery/fried-chicken.png",
        tags: ["chicken", "roll"],
      },
      {
        name: "Mix Box Family",
        description: "4 xil mini-doner, fri va 3 xil sous.",
        category: "Combo",
        price: 119000,
        spicyLevel: "Oddiy",
        prepTime: 18,
        imageUrl: "/foodwagon-v1.0.0/public/assets/img/gallery/meals.png",
        tags: ["family", "combo"],
      },
      {
        name: "Cheese Fries",
        description: "Qovurilgan kartoshka, pishloq kremi va jalapeno.",
        category: "Snack",
        price: 21000,
        spicyLevel: "Yengil",
        prepTime: 8,
        imageUrl: "/foodwagon-v1.0.0/public/assets/img/gallery/steak.png",
        tags: ["fries", "snack"],
      },
      {
        name: "Ayran",
        description: "Tabiiy sovuq ayran, 350ml.",
        category: "Ichimlik",
        price: 9000,
        spicyLevel: "Oddiy",
        prepTime: 3,
        imageUrl: "/foodwagon-v1.0.0/public/assets/img/gallery/kuakata.png",
        tags: ["drink"],
      },
    ];
    await MenuItem.insertMany(defaultMenu);
    console.log(`Seed menu created: ${defaultMenu.length} items`);
  }

  const tableCount = await TableSpot.countDocuments();
  if (tableCount === 0) {
    const generatedTables = [];
    const totalRows = 2;
    const perRow = 10;
    let number = 1;

    for (let row = 0; row < totalRows; row += 1) {
      for (let col = 0; col < perRow; col += 1) {
        generatedTables.push({
          number,
          label: `Stol ${number}`,
          capacity: col % 3 === 0 ? 6 : 4,
          zone: row === 0 ? "Asosiy zal" : "Family zona",
          x: 0.03 + col * 0.095,
          y: 0.12 + row * 0.36,
          width: 0.085,
          height: 0.18,
          shape: col % 2 === 0 ? "rect" : "round",
          isActive: true,
        });
        number += 1;
      }
    }

    await TableSpot.insertMany(generatedTables);
    console.log(`Seed tables created: ${generatedTables.length} spots`);
  }
}

async function startServer() {
  try {
    console.log(`MongoDB ulanishi boshlanmoqda: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected");
    await seedInitialData();
    app.listen(PORT, () => {
      console.log(`Kardeshler Doner server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server start failed:", error);
    process.exit(1);
  }
}

startServer();
