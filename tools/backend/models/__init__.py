"""
WBA99 MSK Analysis - Models Package
Contains all Pydantic models and enums

Phase 2 of backend refactoring - Models extracted.
"""

from .enums import (
    UserRole,
    AssessmentType,
    ExerciseStatus,
    SubscriptionTier,
    PaymentStatus,
    ApprovalStatus,
    OrganizationStatus,
    VideoAnalysisStatus,
    AnalysisRequestStatus,
    AnalysisRequestType,
)

from .user import (
    UserApproval,
    UserPermissions,
    UserSubscription,
    User,
    UserCreate,
    UserLogin,
    UserLogoUpdate,
    UserProfileSettings,
)

from .payment import (
    CreditPackage,
    PaymentSettings,
    FeaturePricing,
    PaymentTransaction,
    PurchaseRequest,
    CreditUsage,
    ReportLog,
)

from .organization import (
    Organization,
    OrganizationCreate,
    OrganizationPayment,
)

from .assessment import (
    PostureData,
    WalkingData,
    RunningData,
    MSKData,
    Assessment,
    AssessmentCreate,
    AssessmentReport,
    AssessmentReportCreate,
)

from .exercise import (
    Exercise,
    ExerciseCreate,
    ExercisePrescription,
    ExercisePrescriptionCreate,
    PrescriptionExerciseItem,
    AssignedExercise,
    AssignedExerciseCreate,
)

__all__ = [
    # Enums
    'UserRole', 'AssessmentType', 'ExerciseStatus', 'SubscriptionTier',
    'PaymentStatus', 'ApprovalStatus', 'OrganizationStatus', 'VideoAnalysisStatus',
    'AnalysisRequestStatus', 'AnalysisRequestType',
    # User models
    'UserApproval', 'UserPermissions', 'UserSubscription', 'User',
    'UserCreate', 'UserLogin', 'UserLogoUpdate', 'UserProfileSettings',
    # Payment models
    'CreditPackage', 'PaymentSettings', 'FeaturePricing', 'PaymentTransaction',
    'PurchaseRequest', 'CreditUsage', 'ReportLog',
    # Organization models
    'Organization', 'OrganizationCreate', 'OrganizationPayment',
    # Assessment models
    'PostureData', 'WalkingData', 'RunningData', 'MSKData',
    'Assessment', 'AssessmentCreate', 'AssessmentReport', 'AssessmentReportCreate',
    # Exercise models
    'Exercise', 'ExerciseCreate', 'ExercisePrescription', 'ExercisePrescriptionCreate',
    'PrescriptionExerciseItem', 'AssignedExercise', 'AssignedExerciseCreate',
]
