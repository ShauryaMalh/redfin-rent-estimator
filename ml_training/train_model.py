# ml_training/train_model.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score, KFold
from sklearn.metrics import make_scorer, mean_absolute_error, r2_score
import joblib
import numpy as np


# --- Load dataset ---
df = pd.read_csv('ml_training/combined_listings.csv')

# --- Feature cleaning ---
def clean_money(val):
    if pd.isna(val) or str(val).strip() == "":
        return 0
    return float(str(val).replace("$", "")
                          .replace(",", "")
                          .replace("/mo", "")
                          .strip())

for col in ["HOA","price","pricePerSqft","principalInterest",
            "propertyTax","homeOwnersInsurance","rentalEarnings"]:
    df[col] = df[col].apply(clean_money)

# --- Drop rows with missing rental earnings ---
df = df[df["rentalEarnings"] > 0]

# --- Encode categoricals ---
encoders = {}
for col in ["listingStatus","propertyType"]:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le


# --- Features & target  ---
drop_cols = ["address","desc","url","mainImage","mlsNumber","scrapeDate",
             "source","lotSize","parking","yearBuilt",
             "rentalEarningsRawResponse","rentalLow","rentalHigh",
             "rentalEarningsSource",]

X = df.drop(columns=drop_cols + ["rentalEarnings"])
y = df["rentalEarnings"]

# --- Train/test split ---
#X_train, X_test, y_train, y_test = train_test_split(    X, y, test_size=0.2, random_state=42)


# --- Train model ---
reg = RandomForestRegressor(
    n_estimators=150,
    max_depth=5,
    min_samples_split=5,
    min_samples_leaf=3,
    random_state=42
)
# --- If using train/test split ---
#reg.fit(X_train, y_train)


# --- Evaluate your train_test_split model if used---
#y_pred = reg.predict(X_test_scaled)
#print("MAE:", mean_absolute_error(y_test, y_pred))
#print("R² Score:", r2_score(y_test, y_pred))

# --- Cross-validation ---
kf = KFold(n_splits=5, shuffle=True, random_state=42)
mae_scorer = make_scorer(mean_absolute_error, greater_is_better=False)
r2_scorer = make_scorer(r2_score)

cv_mae = cross_val_score(reg, X, y, cv=kf, scoring=mae_scorer)
cv_r2 = cross_val_score(reg, X, y, cv=kf, scoring=r2_scorer)

#print("CV MAE scores (negative):", cv_mae)
#print("Mean CV MAE:", -np.mean(cv_mae))
#print("CV R² scores:", cv_r2)]
#print("Mean CV R²:", np.mean(cv_r2))

# --- Train on full dataset ---
reg.fit(X, y)

# --- Feature importance ---
feat_importance = pd.Series(reg.feature_importances_, index=X.columns).sort_values(ascending=False)
#print("\nFeature Importance:")
#print(feat_importance)

# --- Save model ---
joblib.dump(reg, "ml_training/rental_model.pkl")
joblib.dump(encoders, "ml_training/encoders.pkl")

print("✅ Rental prediction model saved!")
