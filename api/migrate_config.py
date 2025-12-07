import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, SystemConfig
from sqlalchemy import inspect
from dotenv import load_dotenv

# Load env vars
load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate_config():
    inspector = inspect(engine)
    if not inspector.has_table("system_config"):
        print("Creating system_config table...")
        SystemConfig.__table__.create(engine)
    else:
        print("system_config table already exists.")

    db = SessionLocal()
    
    # Default Configs
    defaults = [
        {"key": "cancellation_rule_1_hours", "value": "24", "description": "Hours before start for full refund"},
        {"key": "cancellation_rule_2_hours", "value": "2", "description": "Hours before start for partial refund"},
        {"key": "cancellation_rule_2_percent", "value": "50", "description": "Percentage refund for partial window"},
        {"key": "hourly_rate", "value": "10", "description": "Base hourly parking rate"},
    ]
    
    for config in defaults:
        existing = db.query(SystemConfig).filter(SystemConfig.key == config["key"]).first()
        if not existing:
            print(f"Seeding {config['key']} = {config['value']}")
            new_config = SystemConfig(
                key=config["key"],
                value=config["value"],
                description=config["description"]
            )
            db.add(new_config)
    
    db.commit()
    print("Configuration seeding complete.")
    db.close()

if __name__ == "__main__":
    migrate_config()
