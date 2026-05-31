"""
WBA99 MSK Analysis - Enums Module
All enumeration types used across the application
"""

from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    PHYSIO = "physio"
    PATIENT = "patient"
    ORG_HEAD = "org_head"


class AssessmentType(str, Enum):
    POSTURE = "posture"
    WALKING = "walking"
    RUNNING = "running"
    MSK = "msk"
    CAMERA_WALKING = "camera_walking"
    FMS = "fms"
    SPORTS = "sports"
    YOGA = "yoga"
    ANTHROPOMETRY = "anthropometry"
    GONIOMETRY = "goniometry"
    INCLINOMETER = "inclinometer"
    REHAB = "rehab"
    AI_POSTURE = "ai_posture"
    AI_RUNNING = "ai_running"
    ROM = "rom"
    GAIT = "gait"


class ExerciseStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class OrganizationStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"


class VideoAnalysisStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    AWAITING_PAYMENT = "awaiting_payment"
    PAYMENT_RECEIVED = "payment_received"


class AnalysisRequestStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"


class AnalysisRequestType(str, Enum):
    POSTURE = "posture"
    GAIT = "gait"
    MSK = "msk"
    FMS = "fms"
