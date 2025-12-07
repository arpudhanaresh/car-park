
from datetime import datetime
from pydantic import BaseModel

class TestModel(BaseModel):
    dt: datetime

# Create a naive datetime (representing UTC)
naive_dt = datetime.utcnow()
print(f"Naive DT: {naive_dt}")

# Serialize
model = TestModel(dt=naive_dt)
json_output = model.model_dump_json()
print(f"JSON Output: {json_output}")

# Create an aware datetime
from datetime import timezone
aware_dt = datetime.now(timezone.utc)
print(f"Aware DT: {aware_dt}")

model_aware = TestModel(dt=aware_dt)
json_output_aware = model_aware.model_dump_json()
print(f"JSON Output Aware: {json_output_aware}")
