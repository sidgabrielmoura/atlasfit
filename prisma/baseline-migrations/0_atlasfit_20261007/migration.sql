-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('SUPERADMIN', 'TRAINER', 'STUDENT', 'USER');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MANAGER', 'RECEPTIONIST', 'FINANCE', 'TRAINER', 'ASSISTANT', 'STUDENT');

-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'GYM');

-- CreateEnum
CREATE TYPE "MethodType" AS ENUM ('NONE', 'DROPSET', 'REST_PAUSE', 'BISET', 'TRISET', 'CIRCUIT');

-- CreateEnum
CREATE TYPE "EngageStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EngageFormat" AS ENUM ('BANNER', 'CARD', 'DRAWER', 'MODAL', 'FULLSCREEN');

-- CreateEnum
CREATE TYPE "EngageUserStatusType" AS ENUM ('NOT_VIEWED', 'VIEWED', 'INTERACTED', 'PARTICIPATING', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EngageEventType" AS ENUM ('VIEW', 'CLICK', 'DISMISS', 'JOIN', 'COMPLETE');

-- CreateEnum
CREATE TYPE "PushTriggerType" AS ENUM ('SCHEDULED', 'INACTIVITY', 'STREAK_SAVER', 'WORKOUT_COMPLETED', 'ASSESSMENT_DUE', 'BROADCAST');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('DIRECT', 'GROUP', 'WHATSAPP', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'FILE', 'AUDIO');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENDING', 'SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW', 'READY', 'IMPORTING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportProcessingStep" AS ENUM ('IDLE', 'PARSING', 'EXTRACTING', 'NORMALIZING', 'MATCHING', 'PREPARING_REVIEW', 'COMMITTING');

-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('MIXED', 'PDF', 'IMAGE', 'TEXT', 'SPREADSHEET');

-- CreateEnum
CREATE TYPE "ImportSourceStatus" AS ENUM ('PENDING', 'PARSED', 'EXTRACTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRecordStatus" AS ENUM ('EXTRACTED', 'VALIDATED', 'INVALID', 'READY', 'COMMITTED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'EDITED');

-- CreateEnum
CREATE TYPE "ImportRecordSource" AS ENUM ('AI_EXTRACTED', 'DETERMINISTIC', 'USER_EDITED');

-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('STUDENT', 'WORKOUT', 'EXERCISE', 'ASSESSMENT', 'MEASUREMENT');

-- CreateEnum
CREATE TYPE "ImportEntityAction" AS ENUM ('CREATED', 'UPDATED');

-- CreateEnum
CREATE TYPE "DeduplicationMatchLevel" AS ENUM ('EXACT_MATCH', 'PROBABLE_MATCH', 'NO_MATCH');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('ASAAS', 'EFI');

-- CreateEnum
CREATE TYPE "ProviderEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "FinancialAccountStatus" AS ENUM ('NOT_STARTED', 'ONBOARDING', 'PENDING_DOCUMENTS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WalletKycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'DOCUMENTS_REQUIRED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WalletPaymentMethod" AS ENUM ('PIX', 'PIX_AUTOMATIC', 'CREDIT_CARD', 'BOLETO');

-- CreateEnum
CREATE TYPE "StudentBillingStatus" AS ENUM ('DRAFT', 'CREATING', 'PENDING', 'CONFIRMED', 'SETTLED', 'AVAILABLE', 'OVERDUE', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'CHARGEBACKED', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletSubscriptionStatus" AS ENUM ('DRAFT', 'PENDING_AUTHORIZATION', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletPayoutStatus" AS ENUM ('REQUESTED', 'RESERVED', 'SUBMITTED', 'PROCESSING', 'COMPLETED', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('PAYMENT_CONFIRMED', 'PAYMENT_SETTLED', 'PAYMENT_AVAILABLE', 'GATEWAY_FEE', 'PLATFORM_FEE', 'PAYOUT_RESERVED', 'PAYOUT_COMPLETED', 'PAYOUT_RELEASED', 'REFUND', 'PARTIAL_REFUND', 'CHARGEBACK', 'CHARGEBACK_REVERSAL', 'ADJUSTMENT', 'ACTIVATION_FEE_RECOVERY');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('RUNNING', 'MATCHED', 'DIVERGENCES_FOUND', 'FAILED');

-- CreateEnum
CREATE TYPE "FinancialProfileType" AS ENUM ('USER', 'WORKSPACE');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY', 'COOKIES', 'DPA');

-- CreateEnum
CREATE TYPE "LegalDocumentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LegalAcceptanceType" AS ENUM ('TERMS_ACCEPTED', 'PRIVACY_ACKNOWLEDGED', 'COOKIE_CONSENT', 'REACCEPTANCE');

-- CreateEnum
CREATE TYPE "DataSubjectRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'DELETION', 'PORTABILITY', 'CONSENT_REVOCATION', 'INFORMATION', 'OBJECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'IDENTITY_VERIFICATION', 'PROCESSING', 'COMPLETED', 'REJECTED', 'PARTIALLY_COMPLETED');

-- CreateEnum
CREATE TYPE "SecurityIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SecurityIncidentStatus" AS ENUM ('DETECTED', 'INVESTIGATING', 'CONTAINED', 'MITIGATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkspaceSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "GymBillingCycle" AS ENUM ('MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GymEnrollmentStatus" AS ENUM ('DRAFT', 'PENDING_ACCEPTANCE', 'PENDING_ACTIVATION', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GymInvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "GymInvoiceItemType" AS ENUM ('PLAN_SUBSCRIPTION', 'ENROLLMENT_FEE', 'DAILY_PASS', 'PRODUCT', 'SERVICE', 'PENALTY', 'OTHER');

-- CreateEnum
CREATE TYPE "GymInPersonPaymentMethod" AS ENUM ('CASH', 'EXTERNAL_POS_DEBIT', 'EXTERNAL_POS_CREDIT', 'BANK_TRANSFER_MANUAL', 'GATEWAY_ONLINE');

-- CreateEnum
CREATE TYPE "GymPaymentStatus" AS ENUM ('CONFIRMED', 'REVERSED');

-- CreateEnum
CREATE TYPE "GymAllocationStatus" AS ENUM ('ACTIVE', 'REVERSED');

-- CreateEnum
CREATE TYPE "GymRecurrenceMode" AS ENUM ('LOCAL', 'PROVIDER');

-- CreateEnum
CREATE TYPE "GymSubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'OVERDUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GymBillingType" AS ENUM ('UNDEFINED', 'CREDIT_CARD', 'PIX', 'BOLETO');

-- CreateEnum
CREATE TYPE "GymFinancialAccountType" AS ENUM ('CASH', 'BANK_ACCOUNT', 'GATEWAY_ONLINE', 'SAFE_RESERVE', 'OTHER');

-- CreateEnum
CREATE TYPE "GymExpenseStatus" AS ENUM ('PENDING', 'SCHEDULED', 'PAID', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "GymCashDrawerStatus" AS ENUM ('OPEN', 'CLOSED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "GymCashMovementType" AS ENUM ('OPENING', 'CASH_INFLOW_PAYMENT', 'SUPPLY', 'BLEED', 'EXPENSE_PAYMENT', 'CLOSING');

-- CreateEnum
CREATE TYPE "GymDivergenceType" AS ENUM ('UNLINKED_GATEWAY_PAYMENT', 'PAID_GATEWAY_UNPAID_INVOICE', 'AMOUNT_MISMATCH', 'STATUS_MISMATCH', 'CHARGEBACK_DISPUTE', 'ORPHAN_INVOICE');

-- CreateEnum
CREATE TYPE "GymDivergenceStatus" AS ENUM ('PENDING', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "GymClassSessionStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GymClassBookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'LATE_CANCELLED', 'NO_SHOW', 'ATTENDED');

-- CreateEnum
CREATE TYPE "GymClassWaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'PROMOTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GymAccessGrantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GymAccessDecision" AS ENUM ('GRANTED', 'DENIED');

-- CreateEnum
CREATE TYPE "GymDeviceType" AS ENUM ('TURNSTILE', 'FACIAL_TERMINAL', 'RFID_READER', 'BIOMETRIC_READER', 'DOOR_CONTROLLER');

-- CreateEnum
CREATE TYPE "GymDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "GymDeviceCommandType" AS ENUM ('RELEASE_TURNSTILE', 'SYNC_USER', 'DELETE_USER', 'SYNC_CREDENTIAL', 'DELETE_CREDENTIAL', 'SET_CLOCK', 'REBOOT');

-- CreateEnum
CREATE TYPE "GymDeviceCommandStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GymAccessDirection" AS ENUM ('ENTRY', 'EXIT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GymAccessDivergenceSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GymAccessDivergenceStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "setupToken" TEXT,
    "setupTokenExpiresAt" TIMESTAMP(3),
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "GlobalRole" NOT NULL DEFAULT 'USER',
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN,
    "twoFactorSecret" TEXT,
    "twoFactorType" TEXT DEFAULT 'EMAIL',
    "twoFactorBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "threeFactorEnabled" BOOLEAN DEFAULT false,
    "isTestAccount" BOOLEAN NOT NULL DEFAULT false,
    "objective" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "cpfCnpj" TEXT,
    "experienceLevel" TEXT,
    "medicalConditions" TEXT,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bio" TEXT,
    "specialty" TEXT,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "city" TEXT,
    "experience" TEXT,
    "cref" TEXT,
    "imageKey" TEXT,
    "importCredits" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT,
    "referredById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTotpDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTotpDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "WorkspaceType" NOT NULL DEFAULT 'PERSONAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "slogan" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#ea580c',
    "watermarkUrl" TEXT,
    "workoutCoverUrl" TEXT,
    "logoKey" TEXT,
    "watermarkKey" TEXT,
    "workoutCoverKey" TEXT,
    "importCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'Mensal',
    "modality" TEXT NOT NULL DEFAULT 'PRESENCIAL',
    "streak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingControlType" TEXT NOT NULL DEFAULT 'MANUAL',
    "billingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "billingPeriodicity" TEXT NOT NULL DEFAULT 'MENSAL',
    "billingCustomIntervalCount" INTEGER DEFAULT 1,
    "billingCustomIntervalUnit" TEXT DEFAULT 'meses',
    "billingDueDay" INTEGER DEFAULT 10,
    "billingFirstDueDate" TIMESTAMP(3),
    "billingStartDate" TIMESTAMP(3),
    "billingLastGeneratedDate" TIMESTAMP(3),
    "billingNextDueDate" TIMESTAMP(3),
    "billingDescription" TEXT DEFAULT 'Mensalidade de Assessoria',
    "billingCategory" TEXT DEFAULT 'Mensalidade',
    "billingPaymentMethod" TEXT DEFAULT 'PIX',
    "billingIsActive" BOOLEAN NOT NULL DEFAULT true,
    "billingSource" TEXT DEFAULT 'MANUAL',
    "asaasSubscriptionId" TEXT,
    "billingCreatedAt" TIMESTAMP(3),
    "planEndDate" TIMESTAMP(3),
    "canDoAnyWorkoutDay" BOOLEAN NOT NULL DEFAULT false,
    "unitId" TEXT,
    "assignedStaffId" TEXT,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'month',
    "features" TEXT,
    "maxWorkspaces" INTEGER NOT NULL DEFAULT 1,
    "maxStudents" INTEGER,
    "importQuota" INTEGER NOT NULL DEFAULT 25,
    "storageLimitMb" INTEGER NOT NULL DEFAULT 1024,
    "paymentMethods" TEXT DEFAULT 'PIX',
    "imageUrl" TEXT,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isPreSubscription" BOOLEAN NOT NULL DEFAULT false,
    "importQuotaUsed" INTEGER NOT NULL DEFAULT 0,
    "importQuotaResetAt" TIMESTAMP(3),
    "abacateSubscriptionId" TEXT,
    "abacateCustomerId" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeTrial" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeTrial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expirationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "ip" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymStorageObject" (
    "objectKey" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymStorageObject_pkey" PRIMARY KEY ("objectKey")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MuscleGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MuscleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creatorId" TEXT,
    "videoUrl" TEXT,
    "usage" INTEGER NOT NULL DEFAULT 0,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "muscleGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerVideo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "storageKey" TEXT,
    "fileSize" INTEGER,
    "duration" INTEGER,
    "sourceType" TEXT NOT NULL DEFAULT 'UPLOAD',
    "trainerId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerVideoExercise" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerVideoExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "creatorId" TEXT,
    "workspaceId" TEXT,
    "studentId" TEXT,
    "dayOfWeek" INTEGER,
    "muscleGroupLabel" TEXT,
    "restBetweenExercises" TEXT DEFAULT '2 min',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowRepsModification" BOOLEAN NOT NULL DEFAULT true,
    "allowCompleteView" BOOLEAN NOT NULL DEFAULT false,
    "allowSkipExercises" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "rest" TEXT NOT NULL,
    "load" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "methodType" "MethodType" NOT NULL DEFAULT 'NONE',
    "methodConfig" JSONB,
    "groupId" TEXT,
    "allowRepsModification" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'string',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemIntegration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'Zap',
    "status" TEXT NOT NULL DEFAULT 'Operational',
    "latency" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseAdjustmentRequest" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseAdjustmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdjustmentMessage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isReadByTrainer" BOOLEAN NOT NULL DEFAULT true,
    "isReadByAdmin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdjustmentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspacePlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'mensal',
    "link" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspacePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspacePayment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingOrigin" TEXT NOT NULL DEFAULT 'MANUAL',
    "billingMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "generatedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "actionType" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedBy" TEXT,
    "isAutomaticBilled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkspacePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingStudent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "whatsapp" TEXT,
    "cpfCnpj" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'Mensal',
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerTask" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "scheduledDate" TEXT,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "bodyFat" DOUBLE PRECISION,
    "muscleMass" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "abdomen" DOUBLE PRECISION,
    "hips" DOUBLE PRECISION,
    "rightArm" DOUBLE PRECISION,
    "leftArm" DOUBLE PRECISION,
    "rightForearm" DOUBLE PRECISION,
    "leftForearm" DOUBLE PRECISION,
    "rightThigh" DOUBLE PRECISION,
    "leftThigh" DOUBLE PRECISION,
    "rightCalf" DOUBLE PRECISION,
    "leftCalf" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProgressPhoto" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "objectKey" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "uploadedBy" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trainerLiked" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalEvaluation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "bodyFat" DOUBLE PRECISION,
    "muscleMass" DOUBLE PRECISION,
    "dobras" JSONB,
    "anamnese" JSONB,
    "circunferencias" JSONB,
    "postural" JSONB,
    "dorMobilidade" JSONB,
    "testesFisicos" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFile" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" TEXT,
    "url" TEXT NOT NULL,
    "objectKey" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "uploadedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedback" TEXT,
    "effortScore" INTEGER,
    "loads" JSONB,
    "reps" JSONB,
    "restTimes" JSONB,
    "skippedExercises" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyFeedback" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "energy" INTEGER NOT NULL,
    "fatigue" INTEGER NOT NULL,
    "humor" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExerciseGroup" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "type" "MethodType" NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutExerciseGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngageExperience" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "format" "EngageFormat" NOT NULL,
    "status" "EngageStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "showOnlyOnce" BOOLEAN NOT NULL DEFAULT false,
    "blocks" JSONB NOT NULL,
    "segmentation" JSONB NOT NULL,
    "workspaceId" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngageExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngageBanner" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "linkUrl" TEXT,
    "buttonText" TEXT,
    "targetRole" TEXT NOT NULL DEFAULT 'ALL',
    "badgeText" TEXT,
    "bgGradient" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngageBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngageUserStatus" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EngageUserStatusType" NOT NULL DEFAULT 'NOT_VIEWED',
    "firstViewedAt" TIMESTAMP(3),
    "lastInteractedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngageUserStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngageEventLog" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "EngageEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngageEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagePushNotification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "targetRole" TEXT NOT NULL DEFAULT 'ALL',
    "targetPlan" TEXT NOT NULL DEFAULT 'ALL',
    "triggerType" "PushTriggerType" NOT NULL DEFAULT 'SCHEDULED',
    "deepLink" TEXT NOT NULL DEFAULT '/student/workouts',
    "category" TEXT NOT NULL DEFAULT 'TRAINING',
    "titleB" TEXT,
    "bodyB" TEXT,
    "sentCountB" INTEGER NOT NULL DEFAULT 0,
    "clickCountB" INTEGER NOT NULL DEFAULT 0,
    "conversionCountB" INTEGER NOT NULL DEFAULT 0,
    "scheduleTime" TEXT,
    "daysOfWeek" TEXT,
    "inactivityDays" INTEGER,
    "targetWithWorkout" BOOLEAN NOT NULL DEFAULT true,
    "targetWithoutWorkout" BOOLEAN NOT NULL DEFAULT true,
    "onlyNotTrainedToday" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" TEXT NOT NULL DEFAULT 'HIGH',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagePushNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagePushLog" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'A',
    "status" TEXT NOT NULL,
    "errorReason" TEXT,
    "clickedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagePushLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "goal" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "potentialValue" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "lostReason" TEXT,
    "lostReasonDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTask" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "time" TEXT DEFAULT '09:00',
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "options" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadFile" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "objectKey" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firebaseToken" TEXT NOT NULL,
    "platform" TEXT,
    "browser" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "dispatchId" TEXT,
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "icon" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "payload" JSONB,
    "deepLink" TEXT,
    "source" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),
    "workspaceId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCommission" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "pixKey" TEXT NOT NULL,
    "pixKeyType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rejectedReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ChatType" NOT NULL DEFAULT 'DIRECT',
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "attachment" JSONB,
    "replyToId" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "sourceType" "ImportSourceType" NOT NULL DEFAULT 'MIXED',
    "sourcePlatform" TEXT,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "processingStep" "ImportProcessingStep" NOT NULL DEFAULT 'IDLE',
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "totalWorkouts" INTEGER NOT NULL DEFAULT 0,
    "totalExercises" INTEGER NOT NULL DEFAULT 0,
    "totalAssessments" INTEGER NOT NULL DEFAULT 0,
    "totalMeasurements" INTEGER NOT NULL DEFAULT 0,
    "promptVersion" TEXT NOT NULL DEFAULT 'migration-extraction-v1',
    "schemaVersion" TEXT NOT NULL DEFAULT 'migration-v1',
    "modelPrimary" TEXT NOT NULL DEFAULT 'gemini-3.5-flash-lite',
    "modelFallback" TEXT NOT NULL DEFAULT 'gemini-3.6-flash',
    "commitVersion" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT,
    "previewValidated" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "safeErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportSource" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "type" "ImportSourceType" NOT NULL,
    "status" "ImportSourceStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "originalName" TEXT,
    "mimeType" TEXT,
    "extension" TEXT,
    "sizeBytes" INTEGER,
    "storageKey" TEXT,
    "textContent" TEXT,
    "sha256" TEXT,
    "geminiFileName" TEXT,
    "geminiFileExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRecord" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "temporaryEntityId" TEXT NOT NULL,
    "sourceData" JSONB,
    "normalizedData" JSONB,
    "status" "ImportRecordStatus" NOT NULL DEFAULT 'EXTRACTED',
    "reviewStatus" "ImportReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "source" "ImportRecordSource" NOT NULL DEFAULT 'AI_EXTRACTED',
    "confidence" DOUBLE PRECISION,
    "evidence" JSONB,
    "deduplicationMatch" "DeduplicationMatchLevel" NOT NULL DEFAULT 'NO_MATCH',
    "matchedEntityId" TEXT,
    "errorCode" TEXT,
    "safeErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportEntityResult" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "action" "ImportEntityAction" NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "temporaryEntityId" TEXT NOT NULL,
    "databaseEntityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportEntityResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeminiUsageLog" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "userId" TEXT,
    "model" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER DEFAULT 0,
    "thinkingTokens" INTEGER DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeminiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "credits" INTEGER NOT NULL,
    "priceInCents" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "abacatePayProductId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPurchase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "packageId" TEXT,
    "userId" TEXT NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "abacatePayBillingId" TEXT,
    "abacatePayUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderAccount" (
    "id" TEXT NOT NULL,
    "profileType" "FinancialProfileType" NOT NULL DEFAULT 'USER',
    "personalUserId" TEXT,
    "workspaceId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "environment" "ProviderEnvironment" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerWalletId" TEXT,
    "providerCredentialSecretId" TEXT,
    "providerApiKeyEncrypted" TEXT,
    "providerApiKeyKeyVersion" TEXT,
    "status" "FinancialAccountStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "kycStatus" "WalletKycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "providerStatus" TEXT,
    "providerStatusReason" TEXT,
    "legalNameMasked" TEXT,
    "documentLast4" TEXT,
    "payoutDestinationMasked" TEXT,
    "activationFeeTotalInCents" BIGINT NOT NULL DEFAULT 0,
    "activationFeeReservedInCents" BIGINT NOT NULL DEFAULT 0,
    "activationFeeRecoveredInCents" BIGINT NOT NULL DEFAULT 0,
    "activationFeeStatus" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "lastProviderSyncAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletBalanceSnapshot" (
    "id" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "availableAmountInCents" BIGINT NOT NULL,
    "pendingAmountInCents" BIGINT NOT NULL,
    "blockedAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "negativeAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "providerSnapshotId" TEXT,
    "providerPayloadHash" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayCustomer" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "environment" "ProviderEnvironment" NOT NULL,
    "personalUserId" TEXT,
    "workspaceId" TEXT,
    "studentUserId" TEXT,
    "payerUserId" TEXT,
    "payerGuardianId" TEXT,
    "payerCpfCnpj" TEXT,
    "payerNameSnapshot" TEXT,
    "providerCustomerId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "documentLast4" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatewayCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalBillingPlan" (
    "id" TEXT NOT NULL,
    "personalUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amountInCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "intervalMonths" INTEGER NOT NULL DEFAULT 1,
    "preferredPaymentMethod" "WalletPaymentMethod" NOT NULL,
    "dueDay" INTEGER,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalBillingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSubscription" (
    "id" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "providerSubscriptionId" TEXT,
    "providerAuthorizationId" TEXT,
    "status" "WalletSubscriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentMethod" "WalletPaymentMethod" NOT NULL,
    "amountInCentsSnapshot" BIGINT NOT NULL,
    "feeRuleVersionId" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "nextBillingAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBilling" (
    "workspacePaymentId" TEXT,
    "id" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "enrollmentId" TEXT,
    "subscriptionId" TEXT,
    "studentUserId" TEXT NOT NULL,
    "gatewayCustomerId" TEXT,
    "providerBillingId" TEXT,
    "providerStatus" TEXT,
    "payerUserId" TEXT,
    "payerGuardianId" TEXT,
    "payerName" TEXT,
    "payerCpfCnpj" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "billingReference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "grossAmountInCents" BIGINT NOT NULL,
    "gatewayFeeEstimatedInCents" BIGINT NOT NULL DEFAULT 0,
    "gatewayFeeActualInCents" BIGINT,
    "platformFeeEstimatedInCents" BIGINT NOT NULL DEFAULT 0,
    "platformFeeActualInCents" BIGINT,
    "personalNetEstimatedInCents" BIGINT NOT NULL,
    "personalNetActualInCents" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "feeRuleVersionId" TEXT NOT NULL,
    "paymentMethod" "WalletPaymentMethod" NOT NULL,
    "status" "StudentBillingStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "overdueAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "chargebackAt" TIMESTAMP(3),
    "hostedInvoiceUrl" TEXT,
    "refundReason" TEXT,
    "pixPayloadEncrypted" TEXT,
    "pixExpirationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationFeeRecoveryOperation" (
    "id" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "providerTransferId" TEXT,
    "externalReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivationFeeRecoveryOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "providerAttemptId" TEXT,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "failureCode" TEXT,
    "failureMessageSanitized" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSplit" (
    "id" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "receiverType" TEXT NOT NULL,
    "providerWalletId" TEXT,
    "splitType" TEXT NOT NULL,
    "configuredValue" DECIMAL(65,30) NOT NULL,
    "estimatedAmountInCents" BIGINT NOT NULL,
    "actualAmountInCents" BIGINT,
    "providerSplitId" TEXT,
    "providerStatus" TEXT,
    "refusalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedgerEntry" (
    "id" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "billingId" TEXT,
    "payoutId" TEXT,
    "providerEventId" TEXT,
    "providerTransactionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversalOfEntryId" TEXT,
    "description" TEXT NOT NULL,
    "metadataSanitized" JSONB,

    CONSTRAINT "WalletLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletPayoutRequest" (
    "id" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "destinationMasked" TEXT NOT NULL,
    "destinationFingerprint" TEXT NOT NULL,
    "providerTransferId" TEXT,
    "providerStatus" TEXT,
    "status" "WalletPayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "failureCode" TEXT,
    "failureReasonSanitized" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "WalletPayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "environment" "ProviderEnvironment" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "gymWorkspaceId" TEXT,
    "authenticityValidated" BOOLEAN NOT NULL,
    "payloadEncrypted" TEXT,
    "payloadHash" TEXT NOT NULL,
    "processingStatus" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processingAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastErrorSanitized" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queuedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "processingStartedAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOutbox" (
    "id" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payloadEncrypted" TEXT,
    "webhookId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "firstAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "providerReceiptId" TEXT,
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymCommunicationDispatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "recipientsCount" INTEGER NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "deepLinkUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymCommunicationDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeRuleVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "paymentMethod" "WalletPaymentMethod" NOT NULL,
    "platformPercentage" DECIMAL(65,30) NOT NULL,
    "platformFixedInCents" BIGINT NOT NULL,
    "minPlatformFeeInCents" BIGINT,
    "maxPlatformFeeInCents" BIGINT,
    "gatewayFeePolicy" TEXT NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL,
    "activeUntil" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReconciliationRun" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "environment" "ProviderEnvironment" NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'RUNNING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "checkedResources" INTEGER NOT NULL DEFAULT 0,
    "divergencesFound" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "FinancialReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgentSanitized" TEXT,
    "metadataSanitized" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'amber',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapFeature" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorId" TEXT,
    "statusId" TEXT NOT NULL,
    "categoryId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'COMMUNITY',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "priority" TEXT DEFAULT 'MEDIUM',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isCommunityChoice" BOOLEAN NOT NULL DEFAULT false,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "officialResponse" TEXT,
    "officialResponseAt" TIMESTAMP(3),
    "officialResponseById" TEXT,
    "estimatedRelease" TEXT,
    "releasedAt" TIMESTAMP(3),
    "rank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mergedIntoId" TEXT,
    "editedAt" TIMESTAMP(3),
    "editedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RoadmapFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapVote" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapComment" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isModerated" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "editedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RoadmapComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapPoll" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "resultVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "allowVoteChange" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapPollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoadmapPollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapPollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapPollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" "LegalDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "effectiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "representedUserId" TEXT,
    "representationRole" TEXT,
    "documentId" TEXT NOT NULL,
    "documentType" "LegalDocumentType" NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "acceptanceType" "LegalAcceptanceType" NOT NULL DEFAULT 'TERMS_ACCEPTED',
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "locale" TEXT DEFAULT 'pt-BR',
    "source" TEXT DEFAULT 'WEB',
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "documentVersion" TEXT,
    "source" TEXT DEFAULT 'WEB_SETTINGS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" "DataSubjectRequestType" NOT NULL,
    "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "handledBy" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "severity" "SecurityIncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "SecurityIncidentStatus" NOT NULL DEFAULT 'DETECTED',
    "affectedSystems" TEXT,
    "dataCategories" TEXT,
    "affectedUsersCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "containmentActions" TEXT,
    "mitigationActions" TEXT,
    "notificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "notificationAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "operatingHours" JSONB,
    "billingGracePeriodDays" INTEGER NOT NULL DEFAULT 5,
    "capacityLimit" INTEGER,
    "allowMinorSelfCheckin" BOOLEAN NOT NULL DEFAULT false,
    "requireGuardianSignature" BOOLEAN NOT NULL DEFAULT true,
    "biometricValidationMode" TEXT NOT NULL DEFAULT 'LOCAL_AGENT',
    "maxReceptionistDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "maxReceptionistDiscountInCents" BIGINT NOT NULL DEFAULT 2000,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymUnit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "code" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceRoleGrant" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "unitId" TEXT,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "WorkspaceRoleGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "cref" TEXT,
    "jobTitle" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymStaffProfile" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "cref" TEXT,
    "jobTitle" TEXT,
    "bio" TEXT,
    "hireDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymStaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymStudentProfile" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '',
    "registrationRequestKey" TEXT,
    "registrationRequestFingerprint" TEXT,
    "registrationNumber" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "medicalClearance" BOOLEAN NOT NULL DEFAULT false,
    "medicalClearanceExpiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "healthData" JSONB,
    "onboardedAt" TIMESTAMP(3),
    "privacyRestrictedAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymStudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymGuardian" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "guardianUserId" TEXT,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "isLegalRepresentative" BOOLEAN NOT NULL DEFAULT true,
    "isFinancialResponsible" BOOLEAN NOT NULL DEFAULT true,
    "isEmergencyContact" BOOLEAN NOT NULL DEFAULT true,
    "hasHealthAccess" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSubscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT,
    "status" "WorkspaceSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "maxStudents" INTEGER NOT NULL DEFAULT 100,
    "maxStaff" INTEGER NOT NULL DEFAULT 10,
    "maxUnits" INTEGER NOT NULL DEFAULT 1,
    "maxDevices" INTEGER NOT NULL DEFAULT 2,
    "storageLimitMb" INTEGER NOT NULL DEFAULT 5120,
    "externalSubscriptionId" TEXT,
    "externalCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymPlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymPlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceInCents" BIGINT NOT NULL,
    "enrollmentFeeInCents" BIGINT NOT NULL DEFAULT 0,
    "billingCycle" "GymBillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "classCreditsPerCycle" INTEGER,
    "allowedTimeStart" TEXT,
    "allowedTimeEnd" TEXT,
    "allowedDaysOfWeek" TEXT,
    "allowsAllUnits" BOOLEAN NOT NULL DEFAULT true,
    "termsText" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymPlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymEnrollment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "scheduledPlanVersionId" TEXT,
    "supersedesEnrollmentId" TEXT,
    "changeKind" TEXT,
    "changeRequestKey" TEXT,
    "changeRequestFingerprint" TEXT,
    "initialChargeInCents" BIGINT,
    "changeApprovedByUserId" TEXT,
    "changeReason" TEXT,
    "unitId" TEXT,
    "status" "GymEnrollmentStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "priceInCents" BIGINT NOT NULL,
    "enrollmentFeeInCents" BIGINT NOT NULL DEFAULT 0,
    "creditBalanceInCents" BIGINT NOT NULL DEFAULT 0,
    "billingPayerUserId" TEXT,
    "billingPayerGuardianId" TEXT,
    "billingPayerName" TEXT,
    "billingPayerCpf" TEXT,
    "billingPayerEmail" TEXT,
    "billingPayerPhone" TEXT,
    "recurrenceMode" "GymRecurrenceMode" NOT NULL DEFAULT 'LOCAL',
    "providerSubscriptionId" TEXT,
    "retiredProviderSubscriptionId" TEXT,
    "billingAnchorDay" INTEGER,
    "subscriptionStatus" "GymSubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "billingType" "GymBillingType" NOT NULL DEFAULT 'UNDEFINED',
    "checkoutUrl" TEXT,
    "creditCardToken" TEXT,
    "creditCardBrand" TEXT,
    "creditCardLast4" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "nextCycleBillingDate" TIMESTAMP(3),
    "cycleCount" INTEGER NOT NULL DEFAULT 0,
    "lastPaymentStatus" TEXT,
    "accessGranted" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancellationEffectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymContractAcceptance" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "signerUserId" TEXT NOT NULL,
    "representedUserId" TEXT,
    "representationRole" TEXT,
    "termsSnapshot" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymContractAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymEnrollmentEvent" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromStatus" "GymEnrollmentStatus",
    "toStatus" "GymEnrollmentStatus" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymEnrollmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymEnrollmentPause" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "requestedByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "extendEndDate" BOOLEAN NOT NULL DEFAULT true,
    "billingResumePolicy" TEXT NOT NULL DEFAULT 'SKIP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymEnrollmentPause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymInvoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "billingId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "GymInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "competenceMonth" TEXT,
    "recurrenceKey" TEXT,
    "issuanceKey" TEXT,
    "issuanceFingerprint" TEXT,
    "subtotalInCents" BIGINT NOT NULL,
    "discountInCents" BIGINT NOT NULL DEFAULT 0,
    "totalInCents" BIGINT NOT NULL,
    "paidAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "openingPaidAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "balanceRemainingInCents" BIGINT NOT NULL,
    "discountPercentage" DOUBLE PRECISION,
    "discountReason" TEXT,
    "discountAuthorizedByUserId" TEXT,
    "payerType" TEXT NOT NULL DEFAULT 'STUDENT',
    "payerName" TEXT NOT NULL,
    "payerCpfCnpj" TEXT,
    "payerEmail" TEXT,
    "payerPhone" TEXT,
    "providerSubscriptionId" TEXT,
    "cycleNumber" INTEGER,
    "hostedCheckoutUrl" TEXT,
    "pixQrCodePayload" TEXT,
    "pixQrCodeUrl" TEXT,
    "bankSlipUrl" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemType" "GymInvoiceItemType" NOT NULL DEFAULT 'PLAN_SUBSCRIPTION',
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceInCents" BIGINT NOT NULL,
    "totalInCents" BIGINT NOT NULL,
    "planVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymPayment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT,
    "financialAccountId" TEXT,
    "amountInCents" BIGINT NOT NULL,
    "paymentMethod" "GymInPersonPaymentMethod" NOT NULL,
    "status" "GymPaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedByUserId" TEXT NOT NULL,
    "posCardBrand" TEXT,
    "posAuthorizationCode" TEXT,
    "posNsu" TEXT,
    "posTerminalId" TEXT,
    "bankTransferProofUrl" TEXT,
    "bankTransferTransactionId" TEXT,
    "payerName" TEXT NOT NULL,
    "payerCpfCnpj" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedByUserId" TEXT,
    "reversalReason" TEXT,
    "taxDisclaimer" TEXT NOT NULL DEFAULT 'Este documento é um recibo comprobatório de pagamento e não substitui o documento fiscal (NFS-e/NFC-e).',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cashDrawerSessionId" TEXT,

    CONSTRAINT "GymPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymPaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "allocatedAmountInCents" BIGINT NOT NULL,
    "status" "GymAllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymFinancialAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT,
    "name" TEXT NOT NULL,
    "accountType" "GymFinancialAccountType" NOT NULL DEFAULT 'CASH',
    "balanceInCents" BIGINT NOT NULL DEFAULT 0,
    "initialBalanceInCents" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "bankName" TEXT,
    "agencyNumber" TEXT,
    "accountNumber" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymFinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccountTransfer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "requestFingerprint" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymAccountTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymExpenseCategory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymSupplier" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "corporateName" TEXT,
    "cnpjCpf" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contactName" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymExpense" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentNumber" TEXT,
    "amountInCents" BIGINT NOT NULL,
    "penaltyInCents" BIGINT NOT NULL DEFAULT 0,
    "discountInCents" BIGINT NOT NULL DEFAULT 0,
    "paidAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "competenceMonth" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "GymExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "financialAccountId" TEXT,
    "paymentMethod" TEXT,
    "paymentProofUrl" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "paidByUserId" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,
    "requestFingerprint" TEXT,

    CONSTRAINT "GymExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymExpensePayment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "paymentProofUrl" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "reversedByUserId" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymExpensePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymCashDrawerSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT,
    "financialAccountId" TEXT NOT NULL,
    "sessionNumber" TEXT NOT NULL,
    "status" "GymCashDrawerStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedByUserId" TEXT NOT NULL,
    "openingAmountInCents" BIGINT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "expectedCashInCents" BIGINT NOT NULL DEFAULT 0,
    "actualCashInCents" BIGINT,
    "differenceInCents" BIGINT,
    "differenceReason" TEXT,
    "notes" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "reconciledByUserId" TEXT,
    "reconciliationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymCashDrawerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymCashDrawerMovement" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "movementType" "GymCashMovementType" NOT NULL,
    "amountInCents" BIGINT NOT NULL,
    "description" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "paymentId" TEXT,
    "expenseId" TEXT,
    "accountTransferId" TEXT,
    "standaloneReviewedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "requestFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymCashDrawerMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymReconciliationDivergence" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "divergenceType" "GymDivergenceType" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "studentName" TEXT,
    "expectedAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "actualAmountInCents" BIGINT NOT NULL DEFAULT 0,
    "differenceInCents" BIGINT NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "status" "GymDivergenceStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymReconciliationDivergence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAdministrativeReview" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceReference" TEXT NOT NULL,
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymAdministrativeReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymModality" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 50,
    "defaultCapacity" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymModality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymRoom" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxCapacity" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClassSchedule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "modalityId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "instructorStaffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "allowWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "maxWaitlist" INTEGER NOT NULL DEFAULT 5,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClassSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClassSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "modalityId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "instructorStaffId" TEXT NOT NULL,
    "substituteInstructorStaffId" TEXT,
    "substituteReason" TEXT,
    "isSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "allowWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "maxWaitlist" INTEGER NOT NULL DEFAULT 5,
    "status" "GymClassSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "waitlistCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancellationActorUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClassBooking" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "bookedByUserId" TEXT NOT NULL,
    "status" "GymClassBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledByUserId" TEXT,
    "checkInAt" TIMESTAMP(3),
    "checkInMethod" TEXT,
    "checkInStaffMemberId" TEXT,
    "checkedInByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClassBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClassWaitlist" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "GymClassWaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "offeredAt" TIMESTAMP(3),
    "offerExpiresAt" TIMESTAMP(3),
    "promotedBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClassWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccessGrant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "status" "GymAccessGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "allowsAllUnits" BOOLEAN NOT NULL DEFAULT true,
    "allowedUnitIds" JSONB,
    "allowedTimeStart" TEXT,
    "allowedTimeEnd" TEXT,
    "allowedDaysOfWeek" TEXT,
    "credentialType" TEXT NOT NULL DEFAULT 'QR_CODE',
    "credentialCode" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "ruleVersion" TEXT NOT NULL DEFAULT '1.0',
    "lastProjectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccessOverride" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "unitId" TEXT,
    "grantedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revocationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAccessOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccessDecisionLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentMemberId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "decision" "GymAccessDecision" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL DEFAULT '1.0',
    "factors" JSONB NOT NULL,
    "evaluatorType" TEXT NOT NULL DEFAULT 'TURNSTILE_ENGINE',
    "evaluatedByUserId" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymAccessDecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccessDevice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceType" "GymDeviceType" NOT NULL DEFAULT 'TURNSTILE',
    "manufacturer" TEXT NOT NULL DEFAULT 'CONTROL_ID',
    "model" TEXT,
    "serialNumber" TEXT,
    "ipAddress" TEXT,
    "port" INTEGER DEFAULT 80,
    "externalDeviceId" TEXT,
    "deviceTokenHash" TEXT,
    "deviceTokenPrefix" TEXT,
    "status" "GymDeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "firmwareVersion" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "config" JSONB,
    "contingencyMode" BOOLEAN NOT NULL DEFAULT false,
    "contingencyReason" TEXT,
    "contingencyStartedAt" TIMESTAMP(3),
    "contingencyExpiresAt" TIMESTAMP(3),
    "contingencyStartedByUserId" TEXT,
    "lastOfflineSyncAt" TIMESTAMP(3),
    "cacheVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAccessDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymDeviceCommand" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "commandType" "GymDeviceCommandType" NOT NULL,
    "payload" JSONB,
    "idempotencyKey" TEXT,
    "status" "GymDeviceCommandStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resultPayload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymDeviceCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccessLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "deviceId" TEXT,
    "studentMemberId" TEXT,
    "externalPersonId" TEXT,
    "credentialType" TEXT,
    "credentialCode" TEXT,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "direction" "GymAccessDirection" NOT NULL DEFAULT 'ENTRY',
    "reasonCode" TEXT,
    "rawEvent" JSONB,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offlineSequenceId" INTEGER,
    "deduplicationKey" TEXT,
    "wasOffline" BOOLEAN NOT NULL DEFAULT false,
    "clockDriftMs" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAccessReconciliationDivergence" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "deviceId" TEXT,
    "accessLogId" TEXT,
    "studentMemberId" TEXT,
    "divergenceType" TEXT NOT NULL,
    "severity" "GymAccessDivergenceSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "GymAccessDivergenceStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "snapshotData" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionNotes" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAccessReconciliationDivergence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MultiGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MultiGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LeadToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LeadToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_setupToken_key" ON "User"("setupToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_cpfCnpj_idx" ON "User"("cpfCnpj");

-- CreateIndex
CREATE INDEX "UserTotpDevice_userId_idx" ON "UserTotpDevice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_unitId_idx" ON "WorkspaceMember"("unitId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_assignedStaffId_idx" ON "WorkspaceMember"("assignedStaffId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_userId_workspaceId_key" ON "WorkspaceMember"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_abacateSubscriptionId_key" ON "Subscription"("abacateSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "FreeTrial_userId_key" ON "FreeTrial"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "GymStorageObject_workspaceId_status_expiresAt_idx" ON "GymStorageObject"("workspaceId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MuscleGroup_name_key" ON "MuscleGroup"("name");

-- CreateIndex
CREATE INDEX "TrainerVideo_trainerId_idx" ON "TrainerVideo"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerVideo_workspaceId_idx" ON "TrainerVideo"("workspaceId");

-- CreateIndex
CREATE INDEX "TrainerVideoExercise_exerciseId_idx" ON "TrainerVideoExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "TrainerVideoExercise_videoId_idx" ON "TrainerVideoExercise"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerVideoExercise_videoId_exerciseId_key" ON "TrainerVideoExercise"("videoId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SystemIntegration_key_key" ON "SystemIntegration"("key");

-- CreateIndex
CREATE INDEX "ExerciseAdjustmentRequest_exerciseId_idx" ON "ExerciseAdjustmentRequest"("exerciseId");

-- CreateIndex
CREATE INDEX "ExerciseAdjustmentRequest_requesterId_idx" ON "ExerciseAdjustmentRequest"("requesterId");

-- CreateIndex
CREATE INDEX "AdjustmentMessage_requestId_idx" ON "AdjustmentMessage"("requestId");

-- CreateIndex
CREATE INDEX "AdjustmentMessage_senderId_idx" ON "AdjustmentMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingStudent_email_key" ON "PendingStudent"("email");

-- CreateIndex
CREATE INDEX "PendingStudent_workspaceId_idx" ON "PendingStudent"("workspaceId");

-- CreateIndex
CREATE INDEX "TrainerTask_workspaceId_idx" ON "TrainerTask"("workspaceId");

-- CreateIndex
CREATE INDEX "TrainerTask_scheduledDate_idx" ON "TrainerTask"("scheduledDate");

-- CreateIndex
CREATE INDEX "TrainerTask_studentId_idx" ON "TrainerTask"("studentId");

-- CreateIndex
CREATE INDEX "StudentProgress_studentId_idx" ON "StudentProgress"("studentId");

-- CreateIndex
CREATE INDEX "StudentProgress_workspaceId_idx" ON "StudentProgress"("workspaceId");

-- CreateIndex
CREATE INDEX "StudentProgressPhoto_studentId_idx" ON "StudentProgressPhoto"("studentId");

-- CreateIndex
CREATE INDEX "StudentProgressPhoto_workspaceId_idx" ON "StudentProgressPhoto"("workspaceId");

-- CreateIndex
CREATE INDEX "PhysicalEvaluation_studentId_idx" ON "PhysicalEvaluation"("studentId");

-- CreateIndex
CREATE INDEX "PhysicalEvaluation_workspaceId_idx" ON "PhysicalEvaluation"("workspaceId");

-- CreateIndex
CREATE INDEX "StudentFile_studentId_idx" ON "StudentFile"("studentId");

-- CreateIndex
CREATE INDEX "StudentFile_workspaceId_idx" ON "StudentFile"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkoutLog_studentId_idx" ON "WorkoutLog"("studentId");

-- CreateIndex
CREATE INDEX "WorkoutLog_workoutId_idx" ON "WorkoutLog"("workoutId");

-- CreateIndex
CREATE INDEX "WorkoutLog_workspaceId_idx" ON "WorkoutLog"("workspaceId");

-- CreateIndex
CREATE INDEX "DailyFeedback_studentId_idx" ON "DailyFeedback"("studentId");

-- CreateIndex
CREATE INDEX "DailyFeedback_workspaceId_idx" ON "DailyFeedback"("workspaceId");

-- CreateIndex
CREATE INDEX "EngageExperience_workspaceId_idx" ON "EngageExperience"("workspaceId");

-- CreateIndex
CREATE INDEX "EngageExperience_status_idx" ON "EngageExperience"("status");

-- CreateIndex
CREATE INDEX "EngageExperience_startDate_endDate_idx" ON "EngageExperience"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "EngageBanner_targetRole_isActive_idx" ON "EngageBanner"("targetRole", "isActive");

-- CreateIndex
CREATE INDEX "EngageUserStatus_userId_idx" ON "EngageUserStatus"("userId");

-- CreateIndex
CREATE INDEX "EngageUserStatus_experienceId_idx" ON "EngageUserStatus"("experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "EngageUserStatus_experienceId_userId_key" ON "EngageUserStatus"("experienceId", "userId");

-- CreateIndex
CREATE INDEX "EngageEventLog_experienceId_idx" ON "EngageEventLog"("experienceId");

-- CreateIndex
CREATE INDEX "EngageEventLog_userId_idx" ON "EngageEventLog"("userId");

-- CreateIndex
CREATE INDEX "EngagePushNotification_triggerType_isActive_idx" ON "EngagePushNotification"("triggerType", "isActive");

-- CreateIndex
CREATE INDEX "EngagePushNotification_targetRole_idx" ON "EngagePushNotification"("targetRole");

-- CreateIndex
CREATE INDEX "EngagePushLog_userId_idx" ON "EngagePushLog"("userId");

-- CreateIndex
CREATE INDEX "EngagePushLog_notificationId_idx" ON "EngagePushLog"("notificationId");

-- CreateIndex
CREATE INDEX "EngagePushLog_sentAt_idx" ON "EngagePushLog"("sentAt");

-- CreateIndex
CREATE INDEX "EngagePushLog_status_idx" ON "EngagePushLog"("status");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_idx" ON "Lead"("workspaceId");

-- CreateIndex
CREATE INDEX "Lead_ownerId_idx" ON "Lead"("ownerId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE INDEX "LeadTask_leadId_idx" ON "LeadTask"("leadId");

-- CreateIndex
CREATE INDEX "Tag_workspaceId_idx" ON "Tag"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_workspaceId_name_key" ON "Tag"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_workspaceId_idx" ON "CustomFieldDefinition"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_workspaceId_name_key" ON "CustomFieldDefinition"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "CustomFieldValue_leadId_idx" ON "CustomFieldValue"("leadId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_fieldDefinitionId_idx" ON "CustomFieldValue"("fieldDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_leadId_fieldDefinitionId_key" ON "CustomFieldValue"("leadId", "fieldDefinitionId");

-- CreateIndex
CREATE INDEX "LeadFile_leadId_idx" ON "LeadFile"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDevice_firebaseToken_key" ON "NotificationDevice"("firebaseToken");

-- CreateIndex
CREATE INDEX "NotificationDevice_userId_idx" ON "NotificationDevice"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_idx" ON "Notification"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "ReferralCommission_referrerId_idx" ON "ReferralCommission"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralCommission_referredId_idx" ON "ReferralCommission"("referredId");

-- CreateIndex
CREATE INDEX "ReferralCommission_transactionId_idx" ON "ReferralCommission"("transactionId");

-- CreateIndex
CREATE INDEX "PayoutRequest_userId_idx" ON "PayoutRequest"("userId");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_idx" ON "Conversation"("workspaceId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");

-- CreateIndex
CREATE UNIQUE INDEX "DataDeletionRequest_userId_key" ON "DataDeletionRequest"("userId");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_status_idx" ON "DataDeletionRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_idempotencyKey_key" ON "ImportJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ImportJob_workspaceId_idx" ON "ImportJob"("workspaceId");

-- CreateIndex
CREATE INDEX "ImportJob_createdByUserId_idx" ON "ImportJob"("createdByUserId");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportSource_importJobId_idx" ON "ImportSource"("importJobId");

-- CreateIndex
CREATE INDEX "ImportSource_sha256_idx" ON "ImportSource"("sha256");

-- CreateIndex
CREATE INDEX "ImportRecord_importJobId_idx" ON "ImportRecord"("importJobId");

-- CreateIndex
CREATE INDEX "ImportRecord_entityType_idx" ON "ImportRecord"("entityType");

-- CreateIndex
CREATE INDEX "ImportRecord_status_idx" ON "ImportRecord"("status");

-- CreateIndex
CREATE INDEX "ImportRecord_reviewStatus_idx" ON "ImportRecord"("reviewStatus");

-- CreateIndex
CREATE INDEX "ImportEntityResult_importJobId_idx" ON "ImportEntityResult"("importJobId");

-- CreateIndex
CREATE INDEX "ImportEntityResult_databaseEntityId_idx" ON "ImportEntityResult"("databaseEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportEntityResult_importJobId_entityType_temporaryEntityId_key" ON "ImportEntityResult"("importJobId", "entityType", "temporaryEntityId");

-- CreateIndex
CREATE INDEX "GeminiUsageLog_importJobId_idx" ON "GeminiUsageLog"("importJobId");

-- CreateIndex
CREATE INDEX "GeminiUsageLog_userId_idx" ON "GeminiUsageLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPackage_abacatePayProductId_key" ON "CreditPackage"("abacatePayProductId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_abacatePayBillingId_key" ON "CreditPurchase"("abacatePayBillingId");

-- CreateIndex
CREATE INDEX "CreditPurchase_workspaceId_idx" ON "CreditPurchase"("workspaceId");

-- CreateIndex
CREATE INDEX "CreditPurchase_userId_idx" ON "CreditPurchase"("userId");

-- CreateIndex
CREATE INDEX "CreditPurchase_status_idx" ON "CreditPurchase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderAccount_personalUserId_key" ON "PaymentProviderAccount"("personalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderAccount_workspaceId_key" ON "PaymentProviderAccount"("workspaceId");

-- CreateIndex
CREATE INDEX "PaymentProviderAccount_status_kycStatus_idx" ON "PaymentProviderAccount"("status", "kycStatus");

-- CreateIndex
CREATE INDEX "PaymentProviderAccount_profileType_status_idx" ON "PaymentProviderAccount"("profileType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderAccount_provider_environment_providerAccount_key" ON "PaymentProviderAccount"("provider", "environment", "providerAccountId");

-- CreateIndex
CREATE INDEX "WalletBalanceSnapshot_providerAccountId_capturedAt_idx" ON "WalletBalanceSnapshot"("providerAccountId", "capturedAt");

-- CreateIndex
CREATE INDEX "GatewayCustomer_personalUserId_studentUserId_idx" ON "GatewayCustomer"("personalUserId", "studentUserId");

-- CreateIndex
CREATE INDEX "GatewayCustomer_workspaceId_payerCpfCnpj_idx" ON "GatewayCustomer"("workspaceId", "payerCpfCnpj");

-- CreateIndex
CREATE INDEX "GatewayCustomer_workspaceId_studentUserId_idx" ON "GatewayCustomer"("workspaceId", "studentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GatewayCustomer_provider_environment_personalUserId_student_key" ON "GatewayCustomer"("provider", "environment", "personalUserId", "studentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GatewayCustomer_provider_environment_providerCustomerId_key" ON "GatewayCustomer"("provider", "environment", "providerCustomerId");

-- CreateIndex
CREATE INDEX "PersonalBillingPlan_personalUserId_isActive_idx" ON "PersonalBillingPlan"("personalUserId", "isActive");

-- CreateIndex
CREATE INDEX "StudentSubscription_studentUserId_status_idx" ON "StudentSubscription"("studentUserId", "status");

-- CreateIndex
CREATE INDEX "StudentSubscription_providerAccountId_status_nextBillingAt_idx" ON "StudentSubscription"("providerAccountId", "status", "nextBillingAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBilling_workspacePaymentId_key" ON "StudentBilling"("workspacePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBilling_idempotencyKey_key" ON "StudentBilling"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBilling_billingReference_key" ON "StudentBilling"("billingReference");

-- CreateIndex
CREATE INDEX "StudentBilling_studentUserId_status_dueDate_idx" ON "StudentBilling"("studentUserId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "StudentBilling_providerAccountId_status_createdAt_idx" ON "StudentBilling"("providerAccountId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StudentBilling_workspaceId_status_idx" ON "StudentBilling"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "StudentBilling_enrollmentId_idx" ON "StudentBilling"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBilling_providerAccountId_providerBillingId_key" ON "StudentBilling"("providerAccountId", "providerBillingId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationFeeRecoveryOperation_providerTransferId_key" ON "ActivationFeeRecoveryOperation"("providerTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationFeeRecoveryOperation_externalReference_key" ON "ActivationFeeRecoveryOperation"("externalReference");

-- CreateIndex
CREATE INDEX "ActivationFeeRecoveryOperation_providerAccountId_status_idx" ON "ActivationFeeRecoveryOperation"("providerAccountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_billingId_attemptNumber_key" ON "PaymentAttempt"("billingId", "attemptNumber");

-- CreateIndex
CREATE INDEX "PaymentSplit_billingId_receiverType_idx" ON "PaymentSplit"("billingId", "receiverType");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLedgerEntry_idempotencyKey_key" ON "WalletLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_providerAccountId_occurredAt_idx" ON "WalletLedgerEntry"("providerAccountId", "occurredAt");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_billingId_idx" ON "WalletLedgerEntry"("billingId");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_payoutId_idx" ON "WalletLedgerEntry"("payoutId");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_providerEventId_idx" ON "WalletLedgerEntry"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletPayoutRequest_idempotencyKey_key" ON "WalletPayoutRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletPayoutRequest_providerAccountId_status_requestedAt_idx" ON "WalletPayoutRequest"("providerAccountId", "status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletPayoutRequest_providerAccountId_providerTransferId_key" ON "WalletPayoutRequest"("providerAccountId", "providerTransferId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_processingStatus_receivedAt_idx" ON "PaymentWebhookEvent"("processingStatus", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_resourceType_resourceId_idx" ON "PaymentWebhookEvent"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_gymWorkspaceId_processingStatus_receive_idx" ON "PaymentWebhookEvent"("gymWorkspaceId", "processingStatus", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_retry_idx" ON "PaymentWebhookEvent"("processingStatus", "nextRetryAt", "processingStartedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_environment_providerEventId_key" ON "PaymentWebhookEvent"("provider", "environment", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOutbox_requestKey_key" ON "DeliveryOutbox"("requestKey");

-- CreateIndex
CREATE INDEX "DeliveryOutbox_status_nextAttemptAt_leaseExpiresAt_idx" ON "DeliveryOutbox"("status", "nextAttemptAt", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "DeliveryOutbox_webhookId_idx" ON "DeliveryOutbox"("webhookId");

-- CreateIndex
CREATE INDEX "GymCommunicationDispatch_workspaceId_createdAt_idx" ON "GymCommunicationDispatch"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GymCommunicationDispatch_workspaceId_requestKey_key" ON "GymCommunicationDispatch"("workspaceId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "FeeRuleVersion_version_key" ON "FeeRuleVersion"("version");

-- CreateIndex
CREATE INDEX "FeeRuleVersion_paymentMethod_activeFrom_activeUntil_idx" ON "FeeRuleVersion"("paymentMethod", "activeFrom", "activeUntil");

-- CreateIndex
CREATE INDEX "FinancialAuditLog_resourceType_resourceId_createdAt_idx" ON "FinancialAuditLog"("resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialAuditLog_actorUserId_createdAt_idx" ON "FinancialAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapStatus_slug_key" ON "RoadmapStatus"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapCategory_slug_key" ON "RoadmapCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapFeature_slug_key" ON "RoadmapFeature"("slug");

-- CreateIndex
CREATE INDEX "RoadmapFeature_statusId_rank_idx" ON "RoadmapFeature"("statusId", "rank");

-- CreateIndex
CREATE INDEX "RoadmapFeature_categoryId_idx" ON "RoadmapFeature"("categoryId");

-- CreateIndex
CREATE INDEX "RoadmapFeature_authorId_idx" ON "RoadmapFeature"("authorId");

-- CreateIndex
CREATE INDEX "RoadmapFeature_slug_idx" ON "RoadmapFeature"("slug");

-- CreateIndex
CREATE INDEX "RoadmapFeature_visibility_idx" ON "RoadmapFeature"("visibility");

-- CreateIndex
CREATE INDEX "RoadmapVote_userId_idx" ON "RoadmapVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapVote_featureId_userId_key" ON "RoadmapVote"("featureId", "userId");

-- CreateIndex
CREATE INDEX "RoadmapComment_featureId_createdAt_idx" ON "RoadmapComment"("featureId", "createdAt");

-- CreateIndex
CREATE INDEX "RoadmapComment_authorId_idx" ON "RoadmapComment"("authorId");

-- CreateIndex
CREATE INDEX "RoadmapComment_parentId_idx" ON "RoadmapComment"("parentId");

-- CreateIndex
CREATE INDEX "RoadmapPollVote_optionId_idx" ON "RoadmapPollVote"("optionId");

-- CreateIndex
CREATE INDEX "RoadmapPollVote_userId_idx" ON "RoadmapPollVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapPollVote_pollId_userId_key" ON "RoadmapPollVote"("pollId", "userId");

-- CreateIndex
CREATE INDEX "RoadmapAuditLog_actorId_idx" ON "RoadmapAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "RoadmapAuditLog_entity_entityId_idx" ON "RoadmapAuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "LegalDocument_type_status_idx" ON "LegalDocument"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_type_version_key" ON "LegalDocument"("type", "version");

-- CreateIndex
CREATE INDEX "LegalAcceptance_userId_documentType_idx" ON "LegalAcceptance"("userId", "documentType");

-- CreateIndex
CREATE INDEX "LegalAcceptance_representedUserId_idx" ON "LegalAcceptance"("representedUserId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_documentId_idx" ON "LegalAcceptance"("documentId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_acceptedAt_idx" ON "LegalAcceptance"("acceptedAt");

-- CreateIndex
CREATE INDEX "PrivacyConsent_userId_idx" ON "PrivacyConsent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyConsent_userId_purpose_key" ON "PrivacyConsent"("userId", "purpose");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_requesterUserId_idx" ON "DataSubjectRequest"("requesterUserId");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_status_type_idx" ON "DataSubjectRequest"("status", "type");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_workspaceId_status_requestedAt_idx" ON "DataSubjectRequest"("workspaceId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "SecurityIncident_status_severity_idx" ON "SecurityIncident"("status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "GymSettings_workspaceId_key" ON "GymSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "GymUnit_workspaceId_isActive_idx" ON "GymUnit"("workspaceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GymUnit_workspaceId_slug_key" ON "GymUnit"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "WorkspaceRoleGrant_memberId_idx" ON "WorkspaceRoleGrant"("memberId");

-- CreateIndex
CREATE INDEX "WorkspaceRoleGrant_unitId_idx" ON "WorkspaceRoleGrant"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRoleGrant_memberId_role_unitId_key" ON "WorkspaceRoleGrant"("memberId", "role", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_tokenHash_key" ON "WorkspaceInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_workspaceId_email_idx" ON "WorkspaceInvitation"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_workspaceId_status_idx" ON "WorkspaceInvitation"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GymStaffProfile_memberId_key" ON "GymStaffProfile"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "GymStudentProfile_memberId_key" ON "GymStudentProfile"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "GymStudentProfile_registrationRequestKey_key" ON "GymStudentProfile"("registrationRequestKey");

-- CreateIndex
CREATE INDEX "GymStudentProfile_registrationNumber_idx" ON "GymStudentProfile"("registrationNumber");

-- CreateIndex
CREATE INDEX "GymStudentProfile_status_idx" ON "GymStudentProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GymStudentProfile_workspaceId_registrationNumber_key" ON "GymStudentProfile"("workspaceId", "registrationNumber");

-- CreateIndex
CREATE INDEX "GymGuardian_workspaceId_studentMemberId_idx" ON "GymGuardian"("workspaceId", "studentMemberId");

-- CreateIndex
CREATE INDEX "GymGuardian_cpf_idx" ON "GymGuardian"("cpf");

-- CreateIndex
CREATE INDEX "GymGuardian_guardianUserId_idx" ON "GymGuardian"("guardianUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSubscription_workspaceId_key" ON "WorkspaceSubscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSubscription_externalSubscriptionId_key" ON "WorkspaceSubscription"("externalSubscriptionId");

-- CreateIndex
CREATE INDEX "GymPlan_workspaceId_isActive_idx" ON "GymPlan"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "GymPlanVersion_planId_isActive_idx" ON "GymPlanVersion"("planId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GymPlanVersion_planId_version_key" ON "GymPlanVersion"("planId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "GymEnrollment_changeRequestKey_key" ON "GymEnrollment"("changeRequestKey");

-- CreateIndex
CREATE INDEX "GymEnrollment_workspaceId_status_idx" ON "GymEnrollment"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymEnrollment_workspaceId_studentMemberId_idx" ON "GymEnrollment"("workspaceId", "studentMemberId");

-- CreateIndex
CREATE INDEX "GymEnrollment_planVersionId_idx" ON "GymEnrollment"("planVersionId");

-- CreateIndex
CREATE INDEX "GymEnrollment_unitId_idx" ON "GymEnrollment"("unitId");

-- CreateIndex
CREATE INDEX "GymEnrollment_providerSubscriptionId_idx" ON "GymEnrollment"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "GymEnrollment_supersedesEnrollmentId_idx" ON "GymEnrollment"("supersedesEnrollmentId");

-- CreateIndex
CREATE INDEX "GymEnrollment_retiredSubscription_idx" ON "GymEnrollment"("retiredProviderSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "GymContractAcceptance_enrollmentId_key" ON "GymContractAcceptance"("enrollmentId");

-- CreateIndex
CREATE INDEX "GymContractAcceptance_workspaceId_signedAt_idx" ON "GymContractAcceptance"("workspaceId", "signedAt");

-- CreateIndex
CREATE INDEX "GymContractAcceptance_signerUserId_idx" ON "GymContractAcceptance"("signerUserId");

-- CreateIndex
CREATE INDEX "GymEnrollmentEvent_enrollmentId_idx" ON "GymEnrollmentEvent"("enrollmentId");

-- CreateIndex
CREATE INDEX "GymEnrollmentEvent_workspaceId_createdAt_idx" ON "GymEnrollmentEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "GymEnrollmentPause_enrollmentId_idx" ON "GymEnrollmentPause"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "GymInvoice_invoiceNumber_key" ON "GymInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GymInvoice_recurrenceKey_key" ON "GymInvoice"("recurrenceKey");

-- CreateIndex
CREATE UNIQUE INDEX "GymInvoice_issuanceKey_key" ON "GymInvoice"("issuanceKey");

-- CreateIndex
CREATE INDEX "GymInvoice_workspaceId_status_idx" ON "GymInvoice"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymInvoice_workspaceId_studentMemberId_idx" ON "GymInvoice"("workspaceId", "studentMemberId");

-- CreateIndex
CREATE INDEX "GymInvoice_workspaceId_dueDate_idx" ON "GymInvoice"("workspaceId", "dueDate");

-- CreateIndex
CREATE INDEX "GymInvoice_enrollmentId_idx" ON "GymInvoice"("enrollmentId");

-- CreateIndex
CREATE INDEX "GymInvoice_providerSubscriptionId_idx" ON "GymInvoice"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "GymInvoice_enrollmentId_competenceMonth_idx" ON "GymInvoice"("enrollmentId", "competenceMonth");

-- CreateIndex
CREATE INDEX "GymInvoiceItem_invoiceId_idx" ON "GymInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "GymInvoiceItem_planVersionId_idx" ON "GymInvoiceItem"("planVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "GymPayment_paymentNumber_key" ON "GymPayment"("paymentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GymPayment_receiptNumber_key" ON "GymPayment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GymPayment_idempotencyKey_key" ON "GymPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GymPayment_workspaceId_status_idx" ON "GymPayment"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymPayment_workspaceId_paidAt_idx" ON "GymPayment"("workspaceId", "paidAt");

-- CreateIndex
CREATE INDEX "GymPayment_receivedByUserId_idx" ON "GymPayment"("receivedByUserId");

-- CreateIndex
CREATE INDEX "GymPayment_cashDrawerSessionId_idx" ON "GymPayment"("cashDrawerSessionId");

-- CreateIndex
CREATE INDEX "GymPaymentAllocation_paymentId_idx" ON "GymPaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "GymPaymentAllocation_invoiceId_idx" ON "GymPaymentAllocation"("invoiceId");

-- CreateIndex
CREATE INDEX "GymPaymentAllocation_status_idx" ON "GymPaymentAllocation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GymPaymentAllocation_paymentId_invoiceId_key" ON "GymPaymentAllocation"("paymentId", "invoiceId");

-- CreateIndex
CREATE INDEX "GymFinancialAccount_workspaceId_isActive_idx" ON "GymFinancialAccount"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "GymFinancialAccount_workspaceId_accountType_idx" ON "GymFinancialAccount"("workspaceId", "accountType");

-- CreateIndex
CREATE UNIQUE INDEX "GymAccountTransfer_idempotencyKey_key" ON "GymAccountTransfer"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GymAccountTransfer_workspaceId_transferredAt_idx" ON "GymAccountTransfer"("workspaceId", "transferredAt");

-- CreateIndex
CREATE INDEX "GymAccountTransfer_fromAccountId_idx" ON "GymAccountTransfer"("fromAccountId");

-- CreateIndex
CREATE INDEX "GymAccountTransfer_toAccountId_idx" ON "GymAccountTransfer"("toAccountId");

-- CreateIndex
CREATE INDEX "GymExpenseCategory_workspaceId_isActive_idx" ON "GymExpenseCategory"("workspaceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GymExpenseCategory_workspaceId_name_key" ON "GymExpenseCategory"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "GymSupplier_workspaceId_tradeName_idx" ON "GymSupplier"("workspaceId", "tradeName");

-- CreateIndex
CREATE INDEX "GymSupplier_workspaceId_cnpjCpf_idx" ON "GymSupplier"("workspaceId", "cnpjCpf");

-- CreateIndex
CREATE UNIQUE INDEX "GymExpense_idempotencyKey_key" ON "GymExpense"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GymExpense_workspaceId_status_idx" ON "GymExpense"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymExpense_workspaceId_dueDate_idx" ON "GymExpense"("workspaceId", "dueDate");

-- CreateIndex
CREATE INDEX "GymExpense_workspaceId_competenceMonth_idx" ON "GymExpense"("workspaceId", "competenceMonth");

-- CreateIndex
CREATE INDEX "GymExpense_categoryId_idx" ON "GymExpense"("categoryId");

-- CreateIndex
CREATE INDEX "GymExpense_supplierId_idx" ON "GymExpense"("supplierId");

-- CreateIndex
CREATE INDEX "GymExpense_financialAccountId_idx" ON "GymExpense"("financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "GymExpensePayment_idempotencyKey_key" ON "GymExpensePayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GymExpensePayment_expenseId_paidAt_idx" ON "GymExpensePayment"("expenseId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "GymCashDrawerSession_sessionNumber_key" ON "GymCashDrawerSession"("sessionNumber");

-- CreateIndex
CREATE INDEX "GymCashDrawerSession_workspaceId_status_idx" ON "GymCashDrawerSession"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymCashDrawerSession_financialAccountId_idx" ON "GymCashDrawerSession"("financialAccountId");

-- CreateIndex
CREATE INDEX "GymCashDrawerSession_openedByUserId_idx" ON "GymCashDrawerSession"("openedByUserId");

-- CreateIndex
CREATE INDEX "GymCashDrawerSession_openedAt_idx" ON "GymCashDrawerSession"("openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GymCashDrawerMovement_idempotencyKey_key" ON "GymCashDrawerMovement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GymCashDrawerMovement_sessionId_idx" ON "GymCashDrawerMovement"("sessionId");

-- CreateIndex
CREATE INDEX "GymCashDrawerMovement_movementType_idx" ON "GymCashDrawerMovement"("movementType");

-- CreateIndex
CREATE UNIQUE INDEX "GymCashDrawerMovement_accountTransferId_movementType_key" ON "GymCashDrawerMovement"("accountTransferId", "movementType");

-- CreateIndex
CREATE INDEX "GymReconciliationDivergence_workspaceId_status_idx" ON "GymReconciliationDivergence"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymReconciliationDivergence_resourceType_resourceId_idx" ON "GymReconciliationDivergence"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "GymAdministrativeReview_workspaceId_resourceType_createdAt_idx" ON "GymAdministrativeReview"("workspaceId", "resourceType", "createdAt");

-- CreateIndex
CREATE INDEX "GymAdministrativeReview_workspaceId_resourceId_idx" ON "GymAdministrativeReview"("workspaceId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "GymAdministrativeReview_workspaceId_requestKey_key" ON "GymAdministrativeReview"("workspaceId", "requestKey");

-- CreateIndex
CREATE INDEX "GymModality_workspaceId_isActive_idx" ON "GymModality"("workspaceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GymModality_workspaceId_name_key" ON "GymModality"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "GymRoom_workspaceId_unitId_isActive_idx" ON "GymRoom"("workspaceId", "unitId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GymRoom_workspaceId_unitId_name_key" ON "GymRoom"("workspaceId", "unitId", "name");

-- CreateIndex
CREATE INDEX "GymClassSchedule_workspaceId_dayOfWeek_isActive_idx" ON "GymClassSchedule"("workspaceId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "GymClassSchedule_workspaceId_roomId_dayOfWeek_idx" ON "GymClassSchedule"("workspaceId", "roomId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "GymClassSchedule_workspaceId_instructorStaffId_dayOfWeek_idx" ON "GymClassSchedule"("workspaceId", "instructorStaffId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "GymClassSession_workspaceId_sessionDate_status_idx" ON "GymClassSession"("workspaceId", "sessionDate", "status");

-- CreateIndex
CREATE INDEX "GymClassSession_workspaceId_roomId_startsAt_endsAt_idx" ON "GymClassSession"("workspaceId", "roomId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "GymClassSession_workspaceId_instructorStaffId_startsAt_ends_idx" ON "GymClassSession"("workspaceId", "instructorStaffId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "GymClassSession_scheduleId_sessionDate_key" ON "GymClassSession"("scheduleId", "sessionDate");

-- CreateIndex
CREATE INDEX "GymClassBooking_sessionId_status_idx" ON "GymClassBooking"("sessionId", "status");

-- CreateIndex
CREATE INDEX "GymClassBooking_studentMemberId_status_idx" ON "GymClassBooking"("studentMemberId", "status");

-- CreateIndex
CREATE INDEX "GymClassBooking_workspaceId_bookedAt_idx" ON "GymClassBooking"("workspaceId", "bookedAt");

-- CreateIndex
CREATE INDEX "GymClassWaitlist_sessionId_status_position_idx" ON "GymClassWaitlist"("sessionId", "status", "position");

-- CreateIndex
CREATE INDEX "GymClassWaitlist_studentMemberId_status_idx" ON "GymClassWaitlist"("studentMemberId", "status");

-- CreateIndex
CREATE INDEX "GymClassWaitlist_workspaceId_status_idx" ON "GymClassWaitlist"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymAccessGrant_workspaceId_status_idx" ON "GymAccessGrant"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GymAccessGrant_studentMemberId_status_idx" ON "GymAccessGrant"("studentMemberId", "status");

-- CreateIndex
CREATE INDEX "GymAccessGrant_credentialType_credentialCode_idx" ON "GymAccessGrant"("credentialType", "credentialCode");

-- CreateIndex
CREATE INDEX "GymAccessOverride_workspaceId_studentMemberId_isActive_idx" ON "GymAccessOverride"("workspaceId", "studentMemberId", "isActive");

-- CreateIndex
CREATE INDEX "GymAccessOverride_validUntil_idx" ON "GymAccessOverride"("validUntil");

-- CreateIndex
CREATE INDEX "GymAccessDecisionLog_workspaceId_evaluatedAt_idx" ON "GymAccessDecisionLog"("workspaceId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "GymAccessDecisionLog_studentMemberId_evaluatedAt_idx" ON "GymAccessDecisionLog"("studentMemberId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "GymAccessDecisionLog_workspaceId_decision_idx" ON "GymAccessDecisionLog"("workspaceId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "GymAccessDevice_deviceTokenHash_key" ON "GymAccessDevice"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "GymAccessDevice_workspaceId_unitId_status_idx" ON "GymAccessDevice"("workspaceId", "unitId", "status");

-- CreateIndex
CREATE INDEX "GymAccessDevice_deviceTokenHash_idx" ON "GymAccessDevice"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "GymAccessDevice_serialNumber_idx" ON "GymAccessDevice"("serialNumber");

-- CreateIndex
CREATE INDEX "GymDeviceCommand_deviceId_status_priority_idx" ON "GymDeviceCommand"("deviceId", "status", "priority");

-- CreateIndex
CREATE INDEX "GymDeviceCommand_workspaceId_commandType_idx" ON "GymDeviceCommand"("workspaceId", "commandType");

-- CreateIndex
CREATE INDEX "GymDeviceCommand_idempotencyKey_idx" ON "GymDeviceCommand"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "GymDeviceCommand_deviceId_idempotencyKey_key" ON "GymDeviceCommand"("deviceId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "GymAccessLog_deduplicationKey_key" ON "GymAccessLog"("deduplicationKey");

-- CreateIndex
CREATE INDEX "GymAccessLog_workspaceId_unitId_accessedAt_idx" ON "GymAccessLog"("workspaceId", "unitId", "accessedAt");

-- CreateIndex
CREATE INDEX "GymAccessLog_studentMemberId_accessedAt_idx" ON "GymAccessLog"("studentMemberId", "accessedAt");

-- CreateIndex
CREATE INDEX "GymAccessLog_deviceId_accessedAt_idx" ON "GymAccessLog"("deviceId", "accessedAt");

-- CreateIndex
CREATE INDEX "GymAccessLog_externalPersonId_idx" ON "GymAccessLog"("externalPersonId");

-- CreateIndex
CREATE INDEX "GymAccessLog_deduplicationKey_idx" ON "GymAccessLog"("deduplicationKey");

-- CreateIndex
CREATE INDEX "GymAccessLog_wasOffline_idx" ON "GymAccessLog"("wasOffline");

-- CreateIndex
CREATE UNIQUE INDEX "GymAccessReconciliationDivergence_accessLogId_key" ON "GymAccessReconciliationDivergence"("accessLogId");

-- CreateIndex
CREATE INDEX "GymAccessReconciliationDivergence_workspaceId_unitId_status_idx" ON "GymAccessReconciliationDivergence"("workspaceId", "unitId", "status");

-- CreateIndex
CREATE INDEX "GymAccessReconciliationDivergence_studentMemberId_status_idx" ON "GymAccessReconciliationDivergence"("studentMemberId", "status");

-- CreateIndex
CREATE INDEX "GymAccessReconciliationDivergence_detectedAt_idx" ON "GymAccessReconciliationDivergence"("detectedAt");

-- CreateIndex
CREATE INDEX "_MultiGroups_B_index" ON "_MultiGroups"("B");

-- CreateIndex
CREATE INDEX "_LeadToTag_B_index" ON "_LeadToTag"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTotpDevice" ADD CONSTRAINT "UserTotpDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeTrial" ADD CONSTRAINT "FreeTrial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymStorageObject" ADD CONSTRAINT "GymStorageObject_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymStorageObject" ADD CONSTRAINT "GymStorageObject_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_muscleGroupId_fkey" FOREIGN KEY ("muscleGroupId") REFERENCES "MuscleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerVideo" ADD CONSTRAINT "TrainerVideo_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerVideo" ADD CONSTRAINT "TrainerVideo_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerVideoExercise" ADD CONSTRAINT "TrainerVideoExercise_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "TrainerVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerVideoExercise" ADD CONSTRAINT "TrainerVideoExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "WorkoutExerciseGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionActivity" ADD CONSTRAINT "SubscriptionActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionActivity" ADD CONSTRAINT "SubscriptionActivity_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAdjustmentRequest" ADD CONSTRAINT "ExerciseAdjustmentRequest_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAdjustmentRequest" ADD CONSTRAINT "ExerciseAdjustmentRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjustmentMessage" ADD CONSTRAINT "AdjustmentMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ExerciseAdjustmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjustmentMessage" ADD CONSTRAINT "AdjustmentMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspacePlan" ADD CONSTRAINT "WorkspacePlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspacePayment" ADD CONSTRAINT "WorkspacePayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingStudent" ADD CONSTRAINT "PendingStudent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerTask" ADD CONSTRAINT "TrainerTask_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerTask" ADD CONSTRAINT "TrainerTask_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProgress" ADD CONSTRAINT "StudentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProgress" ADD CONSTRAINT "StudentProgress_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProgressPhoto" ADD CONSTRAINT "StudentProgressPhoto_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProgressPhoto" ADD CONSTRAINT "StudentProgressPhoto_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalEvaluation" ADD CONSTRAINT "PhysicalEvaluation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFile" ADD CONSTRAINT "StudentFile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFeedback" ADD CONSTRAINT "DailyFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFeedback" ADD CONSTRAINT "DailyFeedback_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExerciseGroup" ADD CONSTRAINT "WorkoutExerciseGroup_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngageExperience" ADD CONSTRAINT "EngageExperience_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngageExperience" ADD CONSTRAINT "EngageExperience_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngageUserStatus" ADD CONSTRAINT "EngageUserStatus_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "EngageExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngageUserStatus" ADD CONSTRAINT "EngageUserStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngageEventLog" ADD CONSTRAINT "EngageEventLog_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "EngageExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngageEventLog" ADD CONSTRAINT "EngageEventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagePushNotification" ADD CONSTRAINT "EngagePushNotification_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagePushLog" ADD CONSTRAINT "EngagePushLog_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "EngagePushNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagePushLog" ADD CONSTRAINT "EngagePushLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTask" ADD CONSTRAINT "LeadTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFile" ADD CONSTRAINT "LeadFile_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDevice" ADD CONSTRAINT "NotificationDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "GymCommunicationDispatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataDeletionRequest" ADD CONSTRAINT "DataDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSource" ADD CONSTRAINT "ImportSource_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportEntityResult" ADD CONSTRAINT "ImportEntityResult_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeminiUsageLog" ADD CONSTRAINT "GeminiUsageLog_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeminiUsageLog" ADD CONSTRAINT "GeminiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CreditPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProviderAccount" ADD CONSTRAINT "PaymentProviderAccount_personalUserId_fkey" FOREIGN KEY ("personalUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProviderAccount" ADD CONSTRAINT "PaymentProviderAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletBalanceSnapshot" ADD CONSTRAINT "WalletBalanceSnapshot_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayCustomer" ADD CONSTRAINT "GatewayCustomer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubscription" ADD CONSTRAINT "StudentSubscription_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubscription" ADD CONSTRAINT "StudentSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PersonalBillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBilling" ADD CONSTRAINT "StudentBilling_workspacePaymentId_fkey" FOREIGN KEY ("workspacePaymentId") REFERENCES "WorkspacePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBilling" ADD CONSTRAINT "StudentBilling_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBilling" ADD CONSTRAINT "StudentBilling_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBilling" ADD CONSTRAINT "StudentBilling_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBilling" ADD CONSTRAINT "StudentBilling_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "StudentSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationFeeRecoveryOperation" ADD CONSTRAINT "ActivationFeeRecoveryOperation_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationFeeRecoveryOperation" ADD CONSTRAINT "ActivationFeeRecoveryOperation_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "StudentBilling"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "StudentBilling"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSplit" ADD CONSTRAINT "PaymentSplit_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "StudentBilling"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "StudentBilling"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletPayoutRequest" ADD CONSTRAINT "WalletPayoutRequest_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_gymWorkspaceId_fkey" FOREIGN KEY ("gymWorkspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOutbox" ADD CONSTRAINT "DeliveryOutbox_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "PaymentWebhookEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCommunicationDispatch" ADD CONSTRAINT "GymCommunicationDispatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCommunicationDispatch" ADD CONSTRAINT "GymCommunicationDispatch_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapFeature" ADD CONSTRAINT "RoadmapFeature_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapFeature" ADD CONSTRAINT "RoadmapFeature_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "RoadmapStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapFeature" ADD CONSTRAINT "RoadmapFeature_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RoadmapCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapFeature" ADD CONSTRAINT "RoadmapFeature_officialResponseById_fkey" FOREIGN KEY ("officialResponseById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapFeature" ADD CONSTRAINT "RoadmapFeature_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapVote" ADD CONSTRAINT "RoadmapVote_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "RoadmapFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapVote" ADD CONSTRAINT "RoadmapVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapComment" ADD CONSTRAINT "RoadmapComment_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "RoadmapFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapComment" ADD CONSTRAINT "RoadmapComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapComment" ADD CONSTRAINT "RoadmapComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RoadmapComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapComment" ADD CONSTRAINT "RoadmapComment_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapPoll" ADD CONSTRAINT "RoadmapPoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapPollOption" ADD CONSTRAINT "RoadmapPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "RoadmapPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapPollVote" ADD CONSTRAINT "RoadmapPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "RoadmapPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapPollVote" ADD CONSTRAINT "RoadmapPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "RoadmapPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapPollVote" ADD CONSTRAINT "RoadmapPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapAuditLog" ADD CONSTRAINT "RoadmapAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_representedUserId_fkey" FOREIGN KEY ("representedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyConsent" ADD CONSTRAINT "PrivacyConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymSettings" ADD CONSTRAINT "GymSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymUnit" ADD CONSTRAINT "GymUnit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceRoleGrant" ADD CONSTRAINT "WorkspaceRoleGrant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceRoleGrant" ADD CONSTRAINT "WorkspaceRoleGrant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymStaffProfile" ADD CONSTRAINT "GymStaffProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymStudentProfile" ADD CONSTRAINT "GymStudentProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymGuardian" ADD CONSTRAINT "GymGuardian_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymGuardian" ADD CONSTRAINT "GymGuardian_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymGuardian" ADD CONSTRAINT "GymGuardian_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSubscription" ADD CONSTRAINT "WorkspaceSubscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSubscription" ADD CONSTRAINT "WorkspaceSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPlan" ADD CONSTRAINT "GymPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPlanVersion" ADD CONSTRAINT "GymPlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GymPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "GymPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_scheduledPlanVersionId_fkey" FOREIGN KEY ("scheduledPlanVersionId") REFERENCES "GymPlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_supersedesEnrollmentId_fkey" FOREIGN KEY ("supersedesEnrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_billingPayerUserId_fkey" FOREIGN KEY ("billingPayerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollment" ADD CONSTRAINT "GymEnrollment_billingPayerGuardianId_fkey" FOREIGN KEY ("billingPayerGuardianId") REFERENCES "GymGuardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymContractAcceptance" ADD CONSTRAINT "GymContractAcceptance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymContractAcceptance" ADD CONSTRAINT "GymContractAcceptance_signerUserId_fkey" FOREIGN KEY ("signerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymContractAcceptance" ADD CONSTRAINT "GymContractAcceptance_representedUserId_fkey" FOREIGN KEY ("representedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollmentEvent" ADD CONSTRAINT "GymEnrollmentEvent_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEnrollmentPause" ADD CONSTRAINT "GymEnrollmentPause_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoice" ADD CONSTRAINT "GymInvoice_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "StudentBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoiceItem" ADD CONSTRAINT "GymInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "GymInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymInvoiceItem" ADD CONSTRAINT "GymInvoiceItem_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "GymPlanVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPayment" ADD CONSTRAINT "GymPayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPayment" ADD CONSTRAINT "GymPayment_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPayment" ADD CONSTRAINT "GymPayment_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPayment" ADD CONSTRAINT "GymPayment_cashDrawerSessionId_fkey" FOREIGN KEY ("cashDrawerSessionId") REFERENCES "GymCashDrawerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPayment" ADD CONSTRAINT "GymPayment_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPaymentAllocation" ADD CONSTRAINT "GymPaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "GymPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPaymentAllocation" ADD CONSTRAINT "GymPaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "GymInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymFinancialAccount" ADD CONSTRAINT "GymFinancialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymFinancialAccount" ADD CONSTRAINT "GymFinancialAccount_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccountTransfer" ADD CONSTRAINT "GymAccountTransfer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccountTransfer" ADD CONSTRAINT "GymAccountTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccountTransfer" ADD CONSTRAINT "GymAccountTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccountTransfer" ADD CONSTRAINT "GymAccountTransfer_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpenseCategory" ADD CONSTRAINT "GymExpenseCategory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymSupplier" ADD CONSTRAINT "GymSupplier_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "GymSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GymExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpense" ADD CONSTRAINT "GymExpense_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpensePayment" ADD CONSTRAINT "GymExpensePayment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "GymExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpensePayment" ADD CONSTRAINT "GymExpensePayment_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpensePayment" ADD CONSTRAINT "GymExpensePayment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymExpensePayment" ADD CONSTRAINT "GymExpensePayment_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "GymFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCashDrawerSession" ADD CONSTRAINT "GymCashDrawerSession_reconciledByUserId_fkey" FOREIGN KEY ("reconciledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCashDrawerMovement" ADD CONSTRAINT "GymCashDrawerMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GymCashDrawerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCashDrawerMovement" ADD CONSTRAINT "GymCashDrawerMovement_accountTransferId_fkey" FOREIGN KEY ("accountTransferId") REFERENCES "GymAccountTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCashDrawerMovement" ADD CONSTRAINT "GymCashDrawerMovement_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymReconciliationDivergence" ADD CONSTRAINT "GymReconciliationDivergence_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAdministrativeReview" ADD CONSTRAINT "GymAdministrativeReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAdministrativeReview" ADD CONSTRAINT "GymAdministrativeReview_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymModality" ADD CONSTRAINT "GymModality_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymRoom" ADD CONSTRAINT "GymRoom_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymRoom" ADD CONSTRAINT "GymRoom_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "GymModality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GymRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_instructorStaffId_fkey" FOREIGN KEY ("instructorStaffId") REFERENCES "WorkspaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "GymClassSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "GymModality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GymRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_instructorStaffId_fkey" FOREIGN KEY ("instructorStaffId") REFERENCES "WorkspaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSession" ADD CONSTRAINT "GymClassSession_substituteInstructorStaffId_fkey" FOREIGN KEY ("substituteInstructorStaffId") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GymClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassWaitlist" ADD CONSTRAINT "GymClassWaitlist_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassWaitlist" ADD CONSTRAINT "GymClassWaitlist_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GymClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassWaitlist" ADD CONSTRAINT "GymClassWaitlist_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassWaitlist" ADD CONSTRAINT "GymClassWaitlist_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessGrant" ADD CONSTRAINT "GymAccessGrant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessGrant" ADD CONSTRAINT "GymAccessGrant_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessGrant" ADD CONSTRAINT "GymAccessGrant_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GymEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessOverride" ADD CONSTRAINT "GymAccessOverride_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessOverride" ADD CONSTRAINT "GymAccessOverride_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessOverride" ADD CONSTRAINT "GymAccessOverride_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessDecisionLog" ADD CONSTRAINT "GymAccessDecisionLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessDecisionLog" ADD CONSTRAINT "GymAccessDecisionLog_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessDecisionLog" ADD CONSTRAINT "GymAccessDecisionLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessDevice" ADD CONSTRAINT "GymAccessDevice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessDevice" ADD CONSTRAINT "GymAccessDevice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymDeviceCommand" ADD CONSTRAINT "GymDeviceCommand_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymDeviceCommand" ADD CONSTRAINT "GymDeviceCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "GymAccessDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessLog" ADD CONSTRAINT "GymAccessLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessLog" ADD CONSTRAINT "GymAccessLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessLog" ADD CONSTRAINT "GymAccessLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "GymAccessDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessLog" ADD CONSTRAINT "GymAccessLog_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessReconciliationDivergence" ADD CONSTRAINT "GymAccessReconciliationDivergence_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessReconciliationDivergence" ADD CONSTRAINT "GymAccessReconciliationDivergence_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "GymUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessReconciliationDivergence" ADD CONSTRAINT "GymAccessReconciliationDivergence_accessLogId_fkey" FOREIGN KEY ("accessLogId") REFERENCES "GymAccessLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAccessReconciliationDivergence" ADD CONSTRAINT "GymAccessReconciliationDivergence_studentMemberId_fkey" FOREIGN KEY ("studentMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MultiGroups" ADD CONSTRAINT "_MultiGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MultiGroups" ADD CONSTRAINT "_MultiGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "MuscleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeadToTag" ADD CONSTRAINT "_LeadToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeadToTag" ADD CONSTRAINT "_LeadToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Additional verified checks, functions, triggers and partial indexes.
ALTER TABLE public."DeliveryOutbox" ADD CONSTRAINT "DeliveryOutbox_attempts_check" CHECK ((attempts >= 0));

ALTER TABLE public."DeliveryOutbox" ADD CONSTRAINT "DeliveryOutbox_channel_check" CHECK ((channel = ANY (ARRAY['ABLY'::text, 'EMAIL'::text, 'ACTIVATION_FEE'::text, 'PUSH'::text])));

ALTER TABLE public."DeliveryOutbox" ADD CONSTRAINT "DeliveryOutbox_lease_check" CHECK ((("leaseToken" IS NULL) = ("leaseExpiresAt" IS NULL)));

ALTER TABLE public."DeliveryOutbox" ADD CONSTRAINT "DeliveryOutbox_status_check" CHECK ((status = ANY (ARRAY['QUEUED'::text, 'PROCESSING'::text, 'RETRY'::text, 'SENT'::text, 'SKIPPED'::text, 'REVIEW_REQUIRED'::text])));

ALTER TABLE public."GymCommunicationDispatch" ADD CONSTRAINT "GymCommunicationDispatch_recipientsCount_check" CHECK (("recipientsCount" >= 0));

ALTER TABLE public."GymEnrollment" ADD CONSTRAINT "GymEnrollment_billingAnchorDay_check" CHECK ((("billingAnchorDay" IS NULL) OR (("billingAnchorDay" >= 1) AND ("billingAnchorDay" <= 31))));

ALTER TABLE public."GymEnrollment" ADD CONSTRAINT "GymEnrollment_initialCharge_nonnegative" CHECK ((("initialChargeInCents" IS NULL) OR ("initialChargeInCents" >= 0)));

ALTER TABLE public."GymEnrollmentPause" ADD CONSTRAINT "GymEnrollmentPause_resumePolicy_check" CHECK (("billingResumePolicy" = 'SKIP'::text));

ALTER TABLE public."GymExpensePayment" ADD CONSTRAINT "GymExpensePayment_positive_amount" CHECK (("amountInCents" > 0));

ALTER TABLE public."GymExpensePayment" ADD CONSTRAINT "GymExpensePayment_reversal_complete" CHECK (((("reversedAt" IS NULL) AND ("reversedByUserId" IS NULL) AND ("reversalReason" IS NULL)) OR (("reversedAt" IS NOT NULL) AND ("reversedByUserId" IS NOT NULL) AND ("reversalReason" IS NOT NULL) AND (length(TRIM(BOTH FROM "reversalReason")) >= 5))));

ALTER TABLE public."GymInvoice" ADD CONSTRAINT "GymInvoice_openingPaid_check" CHECK (("openingPaidAmountInCents" >= 0));

ALTER TABLE public."GymStorageObject" ADD CONSTRAINT "GymStorageObject_size_check" CHECK ((size > 0));

ALTER TABLE public."GymStorageObject" ADD CONSTRAINT "GymStorageObject_status_check" CHECK ((status = ANY (ARRAY['RESERVED'::text, 'FINALIZED'::text])));

ALTER TABLE public."GymStudentProfile" ADD CONSTRAINT "GymStudentProfile_registration_request_pair" CHECK ((("registrationRequestKey" IS NULL) = ("registrationRequestFingerprint" IS NULL)));

CREATE OR REPLACE FUNCTION public.atlasfit_gym_student_membership_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."workspaceId" <> OLD."workspaceId" AND EXISTS (SELECT 1 FROM "GymStudentProfile" WHERE "memberId" = OLD.id) THEN
    RAISE EXCEPTION 'Student membership workspace requires an explicit transfer';
  END IF;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.atlasfit_gym_student_profile_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE target_workspace TEXT;
BEGIN
  SELECT "workspaceId" INTO target_workspace FROM "WorkspaceMember" WHERE id = NEW."memberId";
  IF target_workspace IS NULL THEN RAISE EXCEPTION 'Student membership does not exist'; END IF;
  IF NEW."workspaceId" <> '' AND NEW."workspaceId" <> target_workspace THEN
    RAISE EXCEPTION 'Student profile workspace does not match membership';
  END IF;
  NEW."workspaceId" := target_workspace;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.gym_command_tenant_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "GymAccessDevice" d JOIN "GymUnit" u ON u.id = d."unitId" JOIN "Workspace" w ON w.id = d."workspaceId" WHERE d.id = NEW."deviceId" AND d."workspaceId" = NEW."workspaceId" AND u."workspaceId" = NEW."workspaceId" AND w.type = 'GYM') THEN
    RAISE EXCEPTION 'GYM command device/unit/workspace mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.gym_review_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ BEGIN
 RAISE EXCEPTION 'Administrative review evidence is immutable' USING ERRCODE = '23514';
END $function$
;

CREATE TRIGGER gym_review_immutable BEFORE DELETE OR UPDATE ON public."GymAdministrativeReview" FOR EACH ROW EXECUTE FUNCTION gym_review_immutable();

CREATE TRIGGER "GymDeviceCommand_tenant_guard" BEFORE INSERT OR UPDATE OF "workspaceId", "deviceId" ON public."GymDeviceCommand" FOR EACH ROW EXECUTE FUNCTION gym_command_tenant_guard();

CREATE TRIGGER atlasfit_gym_student_profile_scope BEFORE INSERT OR UPDATE OF "memberId", "workspaceId" ON public."GymStudentProfile" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_student_profile_scope();

CREATE TRIGGER atlasfit_gym_student_membership_scope BEFORE UPDATE OF "workspaceId" ON public."WorkspaceMember" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_student_membership_scope();

CREATE UNIQUE INDEX "GymCashDrawerSession_active_account_unique" ON public."GymCashDrawerSession" USING btree ("financialAccountId") WHERE (status = 'OPEN'::"GymCashDrawerStatus");

CREATE UNIQUE INDEX "GymCashDrawerSession_active_operator_unique" ON public."GymCashDrawerSession" USING btree ("workspaceId", "openedByUserId") WHERE (status = 'OPEN'::"GymCashDrawerStatus");

CREATE UNIQUE INDEX "GymClassBooking_active_student_session_key" ON public."GymClassBooking" USING btree ("sessionId", "studentMemberId") WHERE (status = ANY (ARRAY['CONFIRMED'::"GymClassBookingStatus", 'ATTENDED'::"GymClassBookingStatus", 'NO_SHOW'::"GymClassBookingStatus"]));

CREATE UNIQUE INDEX "GymClassWaitlist_active_student_session_key" ON public."GymClassWaitlist" USING btree ("sessionId", "studentMemberId") WHERE (status = ANY (ARRAY['WAITING'::"GymClassWaitlistStatus", 'OFFERED'::"GymClassWaitlistStatus"]));

CREATE UNIQUE INDEX "GymEnrollment_open_revision_key" ON public."GymEnrollment" USING btree ("supersedesEnrollmentId") WHERE (("supersedesEnrollmentId" IS NOT NULL) AND (status <> ALL (ARRAY['CANCELLED'::"GymEnrollmentStatus", 'EXPIRED'::"GymEnrollmentStatus"])));

CREATE UNIQUE INDEX "WorkspaceRoleGrant_active_global_unique" ON public."WorkspaceRoleGrant" USING btree ("memberId", role) WHERE (("unitId" IS NULL) AND ("revokedAt" IS NULL));

CREATE UNIQUE INDEX "GymEnrollment_one_live_per_student" ON "GymEnrollment" ("workspaceId", "studentMemberId") WHERE "status" IN ('ACTIVE', 'PAUSED');
