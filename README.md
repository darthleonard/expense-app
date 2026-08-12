# Spendly

![Ionic](https://img.shields.io/badge/Ionic-3880FF?style=for-the-badge&logo=ionic&logoColor=white) ![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white) ![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)

Spendly is a robust, privacy-first, offline-capable mobile application built to help you track household and vehicle expenses, while providing intelligent financial health insights. Designed completely as a free software project, this application runs fully on-device, ensuring your data never leaves your smartphone.

## 🚀 Features

- **Offline-First & Private:** Uses local IndexedDB (via Dexie.js) to store all your data locally. No cloud sync, no tracking, complete privacy.
- **Household Expenses Tracking:** Log rent, electricity, water, gas, and telecommunications for multiple registered properties.
- **Fuel & Vehicle Logging:** Keep track of your car's fuel consumption, odometer readings, and expenses. Supports both Metric (Liters, KM) and Imperial (Gallons, Miles) units based on your language preferences.
- **Intelligent Financial Health:** A dedicated dashboard that uses the 50/30/20 rule to evaluate your budget (Basic Needs, Lifestyle, Wealth Building) and provides smart recommendations based on your spending habits.
- **Multi-Asset Management:** Register and switch between multiple houses or vehicles to segment your expenses precisely.
- **Internationalization (i18n):** Full support for English (`en-US`) and Spanish (`es-MX`).
- **Theming:** Seamless Light and Dark mode support.
- **Cross-Platform Ready:** Built with Ionic and Capacitor, ready to be compiled into a native Android APK or an iOS app.

## 🛠️ Technology Stack

- [Ionic Framework](https://ionicframework.com/) - UI Toolkit
- [Angular](https://angular.io/) - Web Framework
- [Capacitor](https://capacitorjs.com/) - Native runtime
- [Dexie.js](https://dexie.org/) - Minimalist IndexedDB wrapper
- [Ngx-Translate](https://github.com/ngx-translate/core) - Internationalization

## 📦 Building and Running

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Ionic CLI](https://ionicframework.com/docs/cli) (`npm install -g @ionic/cli`)
- [Android Studio](https://developer.android.com/studio) (for building the Android APK)

### Development Server

1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    ionic serve
    ```

### Compiling to Android (APK)

To build the native Android application, run the provided NPM script which handles the Ionic build, Capacitor sync, and opens Android Studio:

```bash
npm run test-device
```

From Android Studio, you can generate a signed APK for deployment via **Build > Generate Signed Bundle / APK**.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page. If you'd like to contribute code:

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

This project is free software. You can distribute it and/or modify it under the terms of your preferred open-source license.

---

_Built with ❤️ for better personal finance management._
