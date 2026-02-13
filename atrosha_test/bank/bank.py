from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI()

class RefundRequest(BaseModel):
    amount: float
    account_id: str

# Initial balance
bank_state = {"balance": 1000.0}

@app.get("/balance")
async def get_balance():
    return bank_state

@app.post("/refund")
async def refund(request: RefundRequest):
    if bank_state["balance"] >= request.amount:
        bank_state["balance"] -= request.amount
        return {"status": "success", "remaining_balance": bank_state["balance"]}
    else:
        raise HTTPException(status_code=400, detail="Insufficient funds")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
