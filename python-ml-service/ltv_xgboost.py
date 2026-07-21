import xgboost as xgb
import pandas as pd
import numpy as np
import os
import joblib

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

def _get_model_path(tenant_id: str):
    return os.path.join(MODEL_DIR, f"ltv_model_{tenant_id}.xgb")

def train_ltv_model(tenant_id: str, features: list, targets: list):
    """
    Trains an XGBoost regression model for 90-day LTV prediction.
    """
    if not features or not targets:
        raise ValueError("Empty training data")
        
    df = pd.DataFrame(features)
    y = np.array(targets)
    
    # Fill missing values
    df.fillna(0, inplace=True)
    
    # Train model
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5
    )
    model.fit(df, y)
    
    # Save model
    model_path = _get_model_path(tenant_id)
    model.save_model(model_path)
    
    # Calculate simple training metrics
    preds = model.predict(df)
    rmse = np.sqrt(np.mean((y - preds)**2))
    
    # Feature importance
    importance = model.feature_importances_
    feature_importance = {col: float(imp) for col, imp in zip(df.columns, importance)}
    
    return {
        "rmse": float(rmse),
        "r2": float(model.score(df, y)),
        "feature_importance": feature_importance
    }

def predict_ltv(tenant_id: str, features: list):
    """
    Predicts 90-day LTV using the trained XGBoost model.
    """
    model_path = _get_model_path(tenant_id)
    if not os.path.exists(model_path):
        # Fallback to a basic heuristic if no model trained yet
        return [0.0] * len(features)
        
    model = xgb.XGBRegressor()
    model.load_model(model_path)
    
    df = pd.DataFrame(features)
    df.fillna(0, inplace=True)
    
    # Ensure columns match training data (in a real app we'd save/load the column schema)
    # For this simulation, we trust the input schema matches.
    
    preds = model.predict(df)
    return preds.tolist()
