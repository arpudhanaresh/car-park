from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                email VARCHAR(100) NOT NULL,
                otp VARCHAR(6) NOT NULL,
                expires_at DATETIME NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX (email),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
            """))
            print("Created password_resets table")
        except Exception as e:
            print(f"Error creating table: {e}")
            
        conn.commit()

if __name__ == "__main__":
    migrate()
