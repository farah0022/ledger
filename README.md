# Records Money Time — Business Ledger

A quiet, precise, local-first business utility for keeping track of records, understanding money, and scheduling time.

Built for independent businesses, freelancers, and operators who value privacy, speed, and ownership over their financial records.

---

## 📥 Download Desktop Apps (Windows, macOS, Linux)

Prebuilt binaries and desktop packages are automatically built and published via GitHub Releases:

- 🪟 **[Download for Windows (.exe)](https://github.com/farah0022/ledger/releases/latest)**
- 🍏 **[Download for macOS (.dmg)](https://github.com/farah0022/ledger/releases/latest)**
- 🐧 **[Download for Linux (.AppImage / .deb)](https://github.com/farah0022/ledger/releases/latest)**

👉 Browse all versions and asset downloads on the **[Releases Page](https://github.com/farah0022/ledger/releases)**.

---

## 🌟 Key Capabilities

- **100% Local-First Storage**: All records and settings are stored directly on your machine in a private JSON vault (`./data/business-ledger.json`). Zero external tracking, zero cloud lock-in.
- **Records Engine**: Track Money In, Money Out, Payments, Contracts, Notes, and Events with instantaneous search, CSV import/export, and flexible tagging.
- **Money & Balances**: Automatic calculation of cash balance, revenue, expenses, and pending receivables. Includes real-time multi-currency exchange conversion.
- **Invoicing & PDF Generator**: Built-in executive invoice builder with your custom business logo, tax calculations, discounts, payment terms, and direct vector PDF downloads via `jsPDF`.
- **Time & Calendar**: Automatically converts scheduled payments, reminders, and deadlines into an organized chronological timeline.
- **Modern Responsive Interface**: Crafted with Tailwind CSS, Lucide icons, keyboard navigation, and refined branding.

---

## 🚀 Quick Start (Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or newer recommended)
- [npm](https://www.npmjs.com/)

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open your browser at `http://localhost:3000` to access the application.

---

## 📦 Packaging & Building Desktop Apps

You can build native desktop binaries using the packaging commands:

```bash
# Package for Windows
npm run package:win

# Package for macOS
npm run package:mac

# Package for Linux
npm run package:linux

# Package all platforms
npm run package:all
```

The resulting installers and executables will be generated in the `./release` directory.

---

## 📄 License

MIT License
