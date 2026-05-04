# Dubai/UAE Mobile Shop POS Roadmap

Last reviewed: 2026-05-04

This roadmap turns the Dubai mobile shop strategy into an implementation backlog for the current Next.js/Mongoose POS. It assumes the existing multi-tenant shop model, VAT channel, IMEI inventory, service jobs, receipts, and English/Arabic groundwork remain the foundation.

## Compliance Notes To Validate

- UAE VAT Profit Margin Scheme is directly relevant to used mobile phones. FTA guidance explicitly lists used mobile phones/electronic devices as second-hand goods eligible for the scheme when the legal conditions are met.
- Profit Margin Scheme invoices must be handled differently from normal VAT invoices. The system should store tax internally for return/reporting, but receipt rendering must follow FTA invoice wording/display rules for the scheme.
- UAE e-invoicing should be treated as a Peppol/electronic-invoice readiness track. MoF guidance issued in February 2026 says the pilot starts on 2026-07-01, voluntary e-invoicing is available from 2026-07-01, mandatory implementation starts 2027-01-01 for businesses with revenue >= AED 50m, and 2027-07-01 for businesses below AED 50m.
- A receipt QR code containing seller/TRN/timestamp/total/VAT can be implemented as a useful retail feature, but it should not be treated as a complete replacement for UAE e-invoicing.
- Dubai Police/CID second-hand goods reporting requirements should be confirmed with the merchant's compliance advisor or local authority channel before locking exact data retention and submission workflows.

Primary references:
- FTA Profit Margin Scheme eligible goods: https://tax.gov.ae/en/content/profit.margin.scheme.eligible.goods.aspx
- FTA Profit Margin Scheme guide, 2026 PDF: https://tax.gov.ae/Datafolder/Files/Pdf/2026/Guide/Profit%20Margin-Scheme-EN-02-01-2026-re.pdf
- MoF UAE Electronic Invoicing Guidelines news: https://mof.gov.ae/en/news/ministry-of-finance-issues-uae-electronic-invoicing-guidelines-to-support-national-rollout/
- MoF e-invoicing timeline announcement: https://mof.gov.ae/ministry-of-finance-announces-the-issuance-of-two-ministerial-decisions-on-the-scope-of-obligations-and-the-timelines-for-implementing-the-electronic-invoicing-system/

## Current Repo Fit

Already present or partly present:
- Multi-tenant `Shop`, role-based portals, and subdomain routing.
- VAT channel sales, VAT extraction, VAT reports, thermal receipt, and A4 invoice.
- IMEI stock via `ProductImei`.
- `Customer` now has KYC-style fields: `emiratesId`, `passportNumber`, `documentFront`, `documentBack`.
- `Product`, `Purchase`, and `Sale` now have early Profit Margin Scheme fields.
- POS already accepts multiple payment rows in the payment modal.
- Service jobs can generate invoices with labour and parts, and service invoice creation deducts parts inventory.
- Product catalog supports condition, IMEI requirement, category, dealer, barcode, batch stock, minimum sale price, and cost code support.
- Reports exist for dashboard, VAT, sales, stock, and profit/loss.

Main gaps:
- Production build currently fails because `POSScreen` passes `hasMarginSchemeItems` from `LastSale` but `LastSale` does not declare that property.
- Margin scheme fields are not yet fully enforced in inventory valuation, VAT reports, A4 invoices, returns, or receipt edge cases.
- Trade-in is not a single checkout transaction; purchases and sales remain operationally separate.
- Split payment exists, but not foreign currency, BNPL metadata, or payment reconciliation-grade detail.
- Receipt/PDF invoice rendering does not yet handle margin scheme wording, QR payloads, or robust Arabic font rendering.
- Non-VAT channel appears in constants/UI copy, but current APIs are VAT-only in practice.
- No shift/Z-report model, stock transfers, RMA flow, aging dashboard, warranty registry, customer credit/layaway, or loyalty/referral layer.
- `ProductImei` is too thin for premium used-phone operations: no condition grade, battery health, color/storage, activation lock status, supplier/customer source, aging bucket, warranty status, branch/location, or acquisition evidence.
- P&L report does not calculate true COGS/gross margin yet; it mainly subtracts expenses from revenue.
- Permissions are broad; a best-in-class SaaS needs granular cashier/technician/manager/owner controls and audit logs.

## Immediate Stabilization

Fix these before building major new modules:

1. Restore production build
- Add `hasMarginSchemeItems?: boolean` to the `LastSale` type in `POSScreen`.
- Run `npm run build` until clean.

2. Clean invoice/Arabic text quality
- Several rendered strings show mojibake characters in UI/PDF text. Audit file encoding and use proper UTF-8 Arabic labels from `messages/ar.json`.
- Embed an Arabic-capable font in `@react-pdf/renderer`.

3. Normalize VAT/non-VAT channel strategy
- Either remove non-VAT from exposed navigation until supported, or implement non-VAT APIs consistently.
- Keep stock/channel design explicit so owners do not accidentally mix VAT and non-VAT sales.

4. Add an immutable transaction/audit ledger
- Every sale, return, trade-in, purchase, shift close, service invoice, stock transfer, and void should create immutable ledger/audit entries.
- This is the backbone for owner trust and compliance.

## Phase 1: Core Compliance And Checkout

Goal: make used-phone sales legally safer and operationally natural.

1. Customer KYC for second-hand buys
- Add customer form fields for Emirates ID/passport, document uploads, and verification status.
- Require KYC fields when creating a used-phone purchase or trade-in.
- Add audit fields: `kycCapturedBy`, `kycCapturedAt`, `documentType`, `documentExpiry`, `documentStorageKey`.

2. Profit Margin Scheme
- Finalize product/purchase/sale semantics:
  - `Product.condition`: `NEW` or `USED`.
  - `Product.isMarginScheme`: default tax treatment for the SKU/device.
  - `Purchase.isMarginScheme`: acquisition was eligible for margin scheme.
  - `Sale.items[].isMarginScheme`: immutable sale-time snapshot.
  - `Sale.items[].marginCost`, `marginProfit`, `marginVatAmount`.
- On sale creation, calculate normal VAT and margin scheme VAT separately.
- Prevent mixed display mistakes: normal VAT lines can show VAT; margin scheme lines should print the required margin scheme statement and suppress line-level VAT disclosure where required.
- Update VAT reports to expose normal VAT, margin scheme output VAT, and excluded/non-vatable totals separately.

3. Trade-in checkout
- Add a `TradeIn` or `InventoryAcquisition` model linked to the sale.
- POS flow: add sale items, attach old-device trade-in, run KYC, apply trade-in as a payment offset.
- On completion:
  - create sale,
  - create acquisition/purchase record,
  - create `ProductImei` in stock for the traded device,
  - create payment rows including `TRADE_IN_OFFSET`.

4. Payment ledger hardening
- Preserve current split payment UX, but enrich rows with `type`, `currency`, `fxRate`, `amountTendered`, `amountAed`, `reference`, and `provider`.
- Add BNPL-ready types: `TABBY`, `TAMARA`, `CARD`, `CASH`, `BANK_TRANSFER`, `TRADE_IN_OFFSET`.

5. Returns and voids
- Add manager approval for voids, refunds, and price-below-margin overrides.
- Make returns reverse normal VAT and margin scheme VAT correctly.
- Track partial returns per sale line so a sale cannot be over-refunded.

6. Customer data protection
- Add consent capture and privacy notice for Emirates ID/passport/document storage.
- Encrypt or store document files outside MongoDB with signed URLs and access audit.
- Add retention policy controls for KYC documents, because UAE PDPL treats identity documents as personal data requiring secure/confidential processing.

## Phase 2: UAE Retail Enhancements

Goal: make the app feel purpose-built for Dubai mobile shops.

1. Receipts and invoices
- Add margin scheme receipt wording.
- Add optional QR payload generation for retail receipts.
- Fix Arabic PDF output with an embedded Arabic-capable font.
- Add bilingual A4 invoice mode instead of separate English/Arabic-only output.

2. Multi-currency cash
- Add `CurrencyRate` model scoped by shop.
- Allow cashier to tender USD/EUR/GBP/etc. and settle base accounting in AED.
- Track change currency and exchange-rate variance.

3. Shift close and Z-report
- Add `Shift` model: opening cash, openedBy, closedBy, expected cash, counted cash, variance, payment totals, refunds, expenses, notes.
- Require active shift for cash POS sales.
- Add close-shift screen and owner summary.

4. Inventory aging and transfer
- Add stock aging report from `ProductImei.createdAt`/purchase date.
- Add alert bands: 30/60/90 days, by brand/model/cost.
- Add stock transfer model between branches/shops, with IMEI-level transfer status.

5. Used-phone grading and warranty
- Add device grade (`A+`, `A`, `B`, `C`), color, storage, battery health, box/accessory flags, activation lock check, and inspection checklist.
- Generate customer warranty cards with QR lookup.
- Support warranty claim workflows for both sold devices and repairs.

6. Real gross margin reporting
- Record cost snapshots on each sale line.
- Add daily/monthly margin dashboard: revenue, COGS, gross profit, discount leakage, VAT payable, dead stock risk.
- Add staff commission reports by product/category/margin, not only sales value.

## Phase 3: Premium SaaS Features

Goal: retention, automation, and owner visibility.

1. WhatsApp/SMS
- Notify customers for sale e-receipts, service status changes, and repair warranty.
- Store message templates per shop and log delivery status.

2. Service center upgrades
- Add parts usage to `ServiceJob`; deduct parts inventory on completion.
- Add repair warranty model and QR warranty lookup.
- Add technician productivity and repeat-repair reporting.

3. RMA and supplier returns
- Add supplier return flow for faulty IMEIs.
- Track credit note, replacement, pending supplier response, and inventory status.

4. E-invoicing readiness
- Add internal canonical invoice JSON separate from PDF/receipt rendering.
- Store seller/buyer identifiers needed by UAE e-invoicing.
- Later integrate with an Accredited Service Provider when the merchant needs mandatory or voluntary electronic invoicing.

5. BNPL and payment provider adapters
- Tabby POS integration can create in-store checkout/payment sessions and expose QR/payment status flows.
- Tamara POS integration can create payment links or QR codes for in-store collection.
- Store provider session IDs, payment status, captures, refunds, webhooks, and reconciliation status.

6. Omnichannel and marketplace readiness
- Add customer-facing invoice/warranty lookup pages.
- Add Shopify/WooCommerce/WhatsApp catalog sync later, but keep POS inventory as source of truth.
- Add delivery/courier tracking for tourist and local delivery workflows.

7. SaaS platform quality
- Subscription billing, tenant plan limits, onboarding wizard, demo data reset, feature flags, backups, observability, and support impersonation with audit.
- Owner mobile dashboard/PWA improvements: today sales, cash variance, low stock, service queue, dead stock, and staff performance.

## Suggested Build Order

1. Fix build and encoding issues.
2. Finish Profit Margin Scheme end-to-end: product, acquisition, sale, return, reports, receipts, A4 invoice.
3. Build KYC-backed trade-in/acquisition checkout.
4. Add payment ledger fields and shift/Z-report reconciliation.
5. Add device grading, aging dashboard, RMA, branch transfers, and warranty lookup.
6. Add WhatsApp/SMS, Tabby/Tamara, and QR receipt provider adapters.
7. Add e-invoicing canonical invoice JSON and ASP integration readiness.
8. Add SaaS operations: tenant billing, feature flags, support tooling, analytics, backups, monitoring.

## Acceptance Criteria For Phase 1

- A used phone bought from an eligible source can be recorded with KYC and IMEI.
- The same device can be resold under Profit Margin Scheme with correct internal margin VAT.
- The printed receipt/PDF shows required margin scheme wording and does not expose prohibited VAT breakdown for those lines.
- Normal VAT sales still behave exactly as before.
- Trade-in checkout produces one customer-facing transaction and two auditable accounting movements.
- VAT report distinguishes normal taxable sales from margin scheme sales.
