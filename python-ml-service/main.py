from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from ltv_xgboost import train_ltv_model, predict_ltv
from mmm_bayesian import run_mmm_simulation

app = FastAPI(title="KIKI ML Service", description="XGBoost LTV & Bayesian MMM")

class TrainingData(BaseModel):
    tenant_id: str
    features: List[Dict[str, Any]]
    targets: List[float]

class PredictionData(BaseModel):
    tenant_id: str
    features: List[Dict[str, Any]]

class MmmData(BaseModel):
    tenant_id: str
    campaigns: List[Dict[str, Any]]

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "kiki-ml"}

@app.post("/ltv/train")
def api_train_ltv(data: TrainingData):
    try:
        metrics = train_ltv_model(data.tenant_id, data.features, data.targets)
        return {"success": True, "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ltv/predict")
def api_predict_ltv(data: PredictionData):
    try:
        predictions = predict_ltv(data.tenant_id, data.features)
        return {"success": True, "predictions": predictions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mmm/simulate")
def api_simulate_mmm(data: MmmData):
    try:
        results = run_mmm_simulation(data.tenant_id, data.campaigns)
        return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
