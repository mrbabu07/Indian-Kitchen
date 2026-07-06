# Indian Kitchen

A full-stack, multi-branch restaurant QR ordering and management system. Customers scan a table QR, order without signing in, pay by UPI or cash, follow live order status, and download a paid invoice. Staff get role-specific live workspaces for kitchen, operations, and administration.

## Stack

- Next.js 14, React, TypeScript
- Express, PostgreSQL, Socket.io
- Prisma ORM with serializable order/payment transactions
- JWT + bcrypt role authentication
- Razorpay UPI, PDFKit invoices, QRCode table codes

## Local setup

1. Install Node.js 20+ and PostgreSQL (or create a Neon database).
2. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` plus a strong `JWT_SECRET`.
3. Copy `apps/web/.env.example` to `apps/web/.env.local`.
4. Run:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run prisma:generate -w apps/api
npm run dev
```

If a development server was running during a production build and Next reports a missing chunk, restart with `npm run dev:fresh`. The build command clears stale generated output automatically.

Open `http://localhost:3000`. The seed prints the QR token for Table 01; customer menu URLs use `http://localhost:3000/menu/<token>`.

Seed staff login: `admin@indiankitchen.local` / `Admin@123`. Change this password before production use.

## Workspaces

- Customer: `/menu/[table-qr-token]`
- Staff sign-in: `/staff/login`
- Admin: `/staff/admin`
- Operator: `/staff/operator`
- Kitchen: `/staff/kitchen`

## API highlights

- Public menu, checkout, payment verification, live status, paid PDF invoice
- Branch-scoped staff order feed with strict state transitions
- Admin CRUD for categories, menu items, tables/QRs, staff, branch settings
- Daily revenue and top-item analytics
- Socket.io rooms isolate events by branch

All order totals are calculated inside a database transaction from current menu prices. Never expose the backend environment file or Razorpay secret in frontend variables.

UPI orders are not broadcast to staff until the Razorpay signature is verified. Gateway-order creation errors trigger a compensating database rollback; failed or dismissed checkout marks the pending order failed/cancelled and restores the customer's cart for a safe retry.
