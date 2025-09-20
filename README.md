# 🏠 Redfin Real Estate Analysis Chrome Extension

[![Python](https://img.shields.io/badge/Python-3.10-blue?logo=python)](https://www.python.org/)  
[![Flask](https://img.shields.io/badge/Flask-Backend-black?logo=flask)](https://flask.palletsprojects.com/)  
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-orange?logo=scikitlearn)](https://scikit-learn.org/)  
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)](https://developer.chrome.com/docs/extensions/)  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A Chrome Extension for real estate investors and analysts that integrates **property management, ML-powered rent prediction, and investment evaluation tools**. Built with a **Flask backend** for machine learning inference and **Chrome APIs** for storage, notifications, and alarms.

---

## 📌 Features

- **Property Management**  
  - Save and categorize Redfin listings (For Sale, Pending, Sold, etc.)
  - Group listings by status in the popup dashboard
  - Persistent storage via `chrome.storage.sync`

- **Machine Learning Rent Prediction**  
  - Predicts monthly rent using trained ML model (Random Forest Regressor)
  - Performance:
    - Mean CV MAE: **$347.79**
    - CV R² Scores: `[0.61, 0.78, 0.73, 0.73, 0.64]`
    - Mean CV R²: **0.70**

- **Investment Analysis Tools**  
  - Calculates ROI, cost-to-rent ratios, and estimated cash flow
  - Breaks down housing costs (HOA, insurance, taxes, mortgage)

- **Chrome Integrations**  
  - **Notifications** for price/rent changes
  - **Background alarms** for scheduled listing checks
  - **CSV Export** of saved listings

- **Third-Party Integration**  
  - RentCast API integration for market rent estimates

---

## 🛠 Tech Stack

- **Frontend (Extension)**: JavaScript, HTML, CSS  
- **Backend (API)**: Flask (Python)  
- **Machine Learning**: scikit-learn (RandomForestRegressor)  
- **Storage**: `chrome.storage.sync`  
- **APIs**: RentCast (rental estimates)  

---

## 📂 Project Structure

/real-estate-extension-project
│
├── assets
│
├── src
│   ├── detail
│   │   ├─ detail.html
│   │   ├─ detail.css
│   │   └─ detail.js
│   ├── popup
│   │   ├─ popup.html
│   │   ├─ popup.css
│   │   └─ popup.js
│   ├─ contentScript.js
│   ├─ background.js
│   └─ utils.js
├── ml_training
│   └─ train_model.py
│   └─ redfinlistings_part2.csv
│   └─ redfinlistings_part1.csv
├── data
│   ├─ model.json
│   └─ scaler.json
│
└── manifest.json


---

## ⚡ Installation & Setup

### 1️⃣ Backend (Flask API)
1. Clone the repo and navigate to `backend/`.
2. Install dependencies:
   ```bash
   pip install flask scikit-learn pandas joblib
### 🔧 Training & Running Backend

**Train model (optional, already included):**
```bash
python train_model.py
python app.py
# Runs on http://127.0.0.1:5000

### 2️⃣ Chrome Extension
1. Go to chrome://extensions/
2. Enable Developer Mode
3. Click Load unpacked → Select extension/ folder
    -Extension will now appear in your Chrome toolbar

---

## 🔑 Usage
-Browse Redfin listings → click Save Listing in popup.
-Listings are grouped by status (For Sale, Pending, etc.).
-Open Details Page to:
    -View ML rent predictions
    -Compare with RentCast API estimate
    -See ROI breakdown (cash flow, % returns)
    -Get Chrome notifications for changes.


---

## 📊 Machine Learning Model

-Algorithm: RandomForestRegressor
-Input Features:
    -Beds, Baths, Sqft, Zipcode, Property Type, Year Built
-Target: Rent (monthly)

-Preprocessing:
    -Label encoding for categorical features
    -Missing value imputation with -1

-Performance:
-Mean CV MAE: $347.79
-Mean CV R²: 0.70


---

## 🚀 Future Improvements

-Add more robust ML model (XGBoost / CatBoost)
-Implement an Options Page for user API key entry
-Use offscreen documents instead of opening full tabs for scraping
-Improve scraping resilience against Redfin DOM changes
-Add visualization charts in popup (ROI over time, rent vs cost)

--- 

## 📜 License
-MIT License – free to use, modify, and distribute.

---

## 👨‍💻 Author
-Developed by Shaurya Malhotra
-Features: real estate investment analysis, ML integration, and Chrome automation.