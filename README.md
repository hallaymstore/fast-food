# Kardeshler Doner Platform

Premium fast-food platform (`Node.js + MongoDB + Cloudinary`) for small business operations.

## Features
- Premium red/black responsive UI (`foodwagon-v1.0.0` assets integrated)
- Day/Night mode
- User auth (JWT)
- Menu listing + cart + order flow
- Admin card payment flow with screenshot upload
- Payment verification by admin (`approve/reject`)
- Full admin panel: users, menu, orders, delivery
- Cloudinary upload for screenshots/menu images (with local fallback)

## Run
1. Install dependencies:
```bash
npm install
```
2. Copy `.env.example` to `.env` and set your values.
3. Start server:
```bash
npm run dev
```
or
```bash
npm start
```

## Default seed admin
- Phone: `+998900000000`
- Password: `admin12345`

(Override from `.env` with `ADMIN_PHONE` and `ADMIN_PASSWORD`.)
