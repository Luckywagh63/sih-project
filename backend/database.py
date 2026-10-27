import os
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, PyMongoError
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DB_NAME = os.getenv("MONGODB_DB", os.getenv("MONGODB_DATABASE", "aicte_workflow")).strip()

_client: Optional[MongoClient] = None
_db = None


def now_utc_iso() -> str:
    """Return current timestamp in ISO 8601 UTC format."""
    return datetime.now(timezone.utc).isoformat()


FALLBACK_URI = "mongodb+srv://law19102005_db_user:ba1VTVTiv5Ca0vwX@cluster0.qisj7sc.mongodb.net/?retryWrites=true&w=majority"


def get_mongo_client() -> Optional[MongoClient]:
    global _client
    if _client is not None:
        return _client

    uris_to_try = []
    if MONGODB_URI:
        uris_to_try.append(MONGODB_URI)
    if FALLBACK_URI not in uris_to_try:
        uris_to_try.append(FALLBACK_URI)

    for uri in uris_to_try:
        try:
            client = MongoClient(
                uri,
                serverSelectionTimeoutMS=4000,
                connectTimeoutMS=4000,
                retryWrites=True,
                appName="AICTE-Workflow-Backend"
            )
            client.admin.command("ping")
            _client = client
            return _client
        except Exception as exc:
            print(f"[Database] Connection attempt to URI failed: {exc}")

    _client = None
    return None


def get_db():
    global _db
    if _db is None:
        client = get_mongo_client()
        if client:
            try:
                _db = client[MONGODB_DB_NAME]
                init_indexes(_db)
                # Auto-seed baseline roles if brand new database
                if _db.users.count_documents({}) == 0:
                    try:
                        from seed_admin import seed
                        seed(seed_demo_accounts=True)
                    except Exception as seed_err:
                        print(f"[Database] Auto-seed notice: {seed_err}")
            except Exception as exc:
                print(f"[Database] Error getting DB '{MONGODB_DB_NAME}': {exc}")
                _db = None
    return _db


def init_indexes(db):
    """Ensure required indexes exist for all collections."""
    try:
        # Applications indexes
        db.applications.create_index([("id", ASCENDING)], unique=True)
        db.applications.create_index([("institution_id", ASCENDING)])
        db.applications.create_index([("status", ASCENDING)])
        db.applications.create_index([("type", ASCENDING)])
        db.applications.create_index([("created_at", DESCENDING)])
        db.applications.create_index([("assigned_reviewer_id", ASCENDING)])
        db.applications.create_index([("created_by_user_id", ASCENDING)])

        # Users indexes
        db.users.create_index([("email", ASCENDING)], unique=True)
        db.users.create_index([("role", ASCENDING)])

        # Documents indexes
        db.documents.create_index([("id", ASCENDING)], unique=True)
        db.documents.create_index([("application_id", ASCENDING), ("doc_type", ASCENDING)])
        db.documents.create_index([("uploaded_at", DESCENDING)])

        # History indexes
        db.history.create_index([("application_id", ASCENDING), ("timestamp", DESCENDING)])

        # Notifications indexes
        db.notifications.create_index([("application_id", ASCENDING), ("created_at", DESCENDING)])
        db.notifications.create_index([("recipient_phone", ASCENDING)])
        db.notifications.create_index([("status", ASCENDING)])
        db.notifications.create_index([("idempotency_key", ASCENDING)], unique=True, sparse=True)
    except Exception as exc:
        print(f"[Database] Index initialization warning: {exc}")


def check_db_health() -> Dict[str, Any]:
    """Check actual MongoDB connection status and latency."""
    client = get_mongo_client()
    if not client or not MONGODB_URI:
        return {
            "connected": False,
            "status": "unconfigured",
            "message": "MONGODB_URI is not set in backend environment.",
            "database": MONGODB_DB_NAME,
            "latency_ms": None,
            "collections": []
        }

    start = time.perf_counter()
    try:
        res = client.admin.command("ping")
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        db = client[MONGODB_DB_NAME]
        collections = db.list_collection_names()
        return {
            "connected": True,
            "status": "healthy",
            "message": "Connected to MongoDB Atlas successfully",
            "database": MONGODB_DB_NAME,
            "latency_ms": latency_ms,
            "ping": res,
            "collections": collections
        }
    except ConnectionFailure as cfe:
        return {
            "connected": False,
            "status": "connection_failure",
            "message": f"Connection to MongoDB Atlas failed: {cfe}",
            "database": MONGODB_DB_NAME,
            "latency_ms": None,
            "collections": []
        }
    except Exception as exc:
        return {
            "connected": False,
            "status": "error",
            "message": f"MongoDB error: {exc}",
            "database": MONGODB_DB_NAME,
            "latency_ms": None,
            "collections": []
        }


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert Mongo document to JSON serializable dict."""
    if doc is None:
        return None
    d = dict(doc)
    d.pop("_id", None)
    return d
