from flask import Flask, request, jsonify
import joblib
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load model + encoders
model = joblib.load("ml_training/rental_model.pkl")
encoders = joblib.load("ml_training/encoders.pkl")

# Features expected by the model
FEATURE_COLUMNS = [
    'HOA', 'baths', 'beds', 'homeOwnersInsurance', 'listingStatus',
    'price', 'pricePerSqft', 'principalInterest', 'propertyTax',
    'propertyType', 'sqft'
]

def clean_money(val):
    if pd.isna(val) or str(val).strip() == "":
        return 0
    return float(str(val).replace("$", "")
                          .replace(",", "")
                          .replace("/mo", "")
                          .strip())

@app.route('/')
def home():
    return "Rental Earnings Prediction is running"

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json  # JSON payload
        df = pd.DataFrame([data])  # Single-row DataFrame

        # Ensure missing features are filled with 0
        for col in FEATURE_COLUMNS:
            if col not in df.columns:
                df[col] = 0

        # Clean money-like fields
        for col in ["HOA", "price", "pricePerSqft",
                    "principalInterest", "propertyTax", "homeOwnersInsurance"]:
            df[col] = df[col].apply(clean_money)

        # Encode categoricals using saved encoders
        for col in ["listingStatus", "propertyType"]:
            le = encoders[col]
            df[col] = df[col].apply(lambda x: le.transform([str(x)])[0] 
                                     if str(x) in le.classes_ else -1)

        # Keep correct feature order
        df = df[FEATURE_COLUMNS]

        # Predict rental earnings
        pred = model.predict(df)[0]

        return jsonify({
            "predictedRentalEarnings": round(float(pred), 2)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True)
