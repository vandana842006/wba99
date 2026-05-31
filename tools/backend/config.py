"""
WBA99 MSK Analysis - Configuration Module
Central configuration for database, environment, and constants
"""

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise RuntimeError("MONGO_URL environment variable is required")

db_name = os.environ.get('DB_NAME')
if not db_name:
    raise RuntimeError("DB_NAME environment variable is required")

# Create MongoDB client
client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=10000,
    maxPoolSize=10,
    retryWrites=True
)
db = client[db_name]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Allowed admin emails whitelist
ALLOWED_ADMIN_EMAILS = [
    'sportsphysio009@gmail.com',
    'sportsphysio001@gmail.com',
    'wba99physio@gmail.com',
    'admin@wba99.com',
]

# FREE ACCOUNTS - These accounts don't need payment
FREE_ACCOUNTS = [
    # Admin accounts
    'admin@wba99.com',
    'sportsphysio009@gmail.com',
    'sportsphysio001@gmail.com',
    'wba99physio@gmail.com',
    # Demo accounts
    'sarah@wba99.com',
    'demo@wba99.com',
    'test@wba99.com',
    'sarahpatient@wba99.com',
    'orgdemo@wba99.com',
]


def is_free_account(email: str) -> bool:
    """Check if account is free (admin/demo)"""
    return email.lower() in [e.lower() for e in FREE_ACCOUNTS]
