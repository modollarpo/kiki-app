import numpy as np
import pandas as pd
import pymc as pm
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mmm_bayesian")

def run_mmm_simulation(tenant_id: str, campaigns: list):
    """
    Simulates a Bayesian Media Mix Model (MMM) using PyMC.
    In a true production environment, this would use a library like LightweightMMM or Robyn.
    For this MVP, we build a simplified Adstock / Diminishing Returns model.
    """
    if not campaigns:
        raise ValueError("No campaign data provided")
        
    df = pd.DataFrame(campaigns)
    
    # Ensure necessary columns
    for col in ['platform', 'spend', 'revenue', 'impressions']:
        if col not in df.columns:
            df[col] = 0.0

    # Aggregate by platform
    grouped = df.groupby('platform').sum().reset_index()
    platforms = grouped['platform'].tolist()
    spend = grouped['spend'].values
    revenue = grouped['revenue'].values
    
    total_revenue = revenue.sum()
    if total_revenue == 0:
        # Prevent division by zero if no revenue
        return {
            "model_fit": {"r_squared": 0, "status": "no_revenue"},
            "channels": [{"platform": p, "contribution": 0, "roi": 0} for p in platforms]
        }
        
    # --- PyMC Bayesian Simulation ---
    # We set up a simple linear model: revenue ~ sum(alpha_i * spend_i)
    # where alpha_i is the ROI for platform i.
    # In a full model, we'd add Adstock (carryover) and Hill (saturation) transformations.
    
    try:
        with pm.Model() as mmm:
            # Priors for ROI (assume positive ROI between 0 and 5)
            alpha = pm.HalfNormal("alpha", sigma=2, shape=len(platforms))
            
            # Base baseline sales (organic)
            baseline = pm.HalfNormal("baseline", sigma=total_revenue * 0.1)
            
            # Expected revenue
            mu = baseline + pm.math.dot(spend, alpha)
            
            # Likelihood (assuming some noise)
            sigma = pm.HalfNormal("sigma", sigma=total_revenue * 0.05)
            Y_obs = pm.Normal("Y_obs", mu=mu, sigma=sigma, observed=total_revenue)
            
            # For speed in this microservice, we use MAP (Maximum a Posteriori) 
            # instead of full MCMC sampling (pm.sample).
            map_estimate = pm.find_MAP()
            
        rois = map_estimate["alpha"]
        base_sales = float(map_estimate["baseline"])
        
        channels = []
        for i, p in enumerate(platforms):
            contribution = spend[i] * rois[i]
            channels.append({
                "platform": p,
                "spend": float(spend[i]),
                "revenue_contribution": float(contribution),
                "marginal_roi": float(rois[i]),
                "recommended_change": "increase" if rois[i] > 2.0 else "decrease" if rois[i] < 1.0 else "maintain"
            })
            
        return {
            "model_fit": {
                "status": "converged",
                "baseline_sales": base_sales,
                "algorithm": "Bayesian MAP Estimate (PyMC)"
            },
            "channels": channels
        }
    except Exception as e:
        logger.error(f"MMM simulation failed: {e}")
        # Fallback
        return {
            "model_fit": {"status": "failed", "error": str(e)},
            "channels": [{"platform": p, "spend": float(s), "revenue_contribution": float(r), "marginal_roi": float(r/s) if s>0 else 0} 
                         for p, s, r in zip(platforms, spend, revenue)]
        }
