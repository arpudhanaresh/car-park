import pymysql
import os
from dotenv import load_dotenv
from contextlib import contextmanager

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('MYSQL_HOST'),
    'port': int(os.getenv('MYSQL_PORT', 15350)),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': os.getenv('MYSQL_DATABASE'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': False
}

def get_connection():
    return pymysql.connect(**DB_CONFIG)

@contextmanager
def get_db_cursor(commit=True):
    connection = get_connection()
    cursor = connection.cursor()
    try:
        yield cursor
        if commit:
            connection.commit()
    except Exception as e:
        connection.rollback()
        raise e
    finally:
        cursor.close()
        connection.close()

def init_database():
    connection = pymysql.connect(
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        charset='utf8mb4'
    )

    try:
        cursor = connection.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_CONFIG['database']}`")
        cursor.execute(f"USE `{DB_CONFIG['database']}`")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                role ENUM('user', 'admin') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS parking_layout (
                id INT AUTO_INCREMENT PRIMARY KEY,
                rows INT NOT NULL DEFAULT 5,
                cols INT NOT NULL DEFAULT 5,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS parking_spots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                row_num INT NOT NULL,
                col_num INT NOT NULL,
                is_booked BOOLEAN DEFAULT FALSE,
                UNIQUE KEY unique_spot (row_num, col_num),
                INDEX idx_booked (is_booked)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                spot_id INT NOT NULL,
                spot_info VARCHAR(100) NOT NULL,
                vehicle_number VARCHAR(50) NOT NULL,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                payment_method VARCHAR(50) DEFAULT 'ringgitpay',
                status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
                cancellation_reason TEXT,
                cancellation_time DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (spot_id) REFERENCES parking_spots(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_status (status),
                INDEX idx_start_date (start_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)

        cursor.execute("SELECT COUNT(*) as count FROM parking_layout")
        result = cursor.fetchone()
        if result['count'] == 0:
            cursor.execute("INSERT INTO parking_layout (rows, cols) VALUES (5, 5)")

        cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
        result = cursor.fetchone()
        if result['count'] == 0:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            admin_password = pwd_context.hash("admin123")
            cursor.execute("""
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES (%s, %s, %s, %s)
            """, ('admin@carpark.com', admin_password, 'System Admin', 'admin'))

        connection.commit()
        print("Database initialized successfully!")

    except Exception as e:
        connection.rollback()
        print(f"Error initializing database: {e}")
        raise
    finally:
        cursor.close()
        connection.close()
