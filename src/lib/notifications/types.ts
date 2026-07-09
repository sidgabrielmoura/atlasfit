export enum NotificationType {
  TRAINING_CREATED = "TRAINING_CREATED",
  TRAINING_UPDATED = "TRAINING_UPDATED",
  TRAINING_COMPLETED = "TRAINING_COMPLETED",
  ASSESSMENT_CREATED = "ASSESSMENT_CREATED",
  MESSAGE_RECEIVED = "MESSAGE_RECEIVED",
  PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  CAMPAIGN = "CAMPAIGN",
  SYSTEM = "SYSTEM",
  LEVEL_UP = "LEVEL_UP",
  BADGE_UNLOCKED = "BADGE_UNLOCKED",
  XP_RECEIVED = "XP_RECEIVED",
  GOAL_COMPLETED = "GOAL_COMPLETED",
  SECURITY = "SECURITY",
  LOGIN = "LOGIN"
}

export enum NotificationCategory {
  TRAINING = "TRAINING",
  ASSESSMENT = "ASSESSMENT",
  NUTRITION = "NUTRITION",
  CRM = "CRM",
  FINANCE = "FINANCE",
  SYSTEM = "SYSTEM",
  CAMPAIGN = "CAMPAIGN",
  MESSAGE = "MESSAGE",
  GAMIFICATION = "GAMIFICATION",
  MARKETING = "MARKETING"
}

export enum NotificationPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

export interface CategoryPreference {
  push: boolean;
  inApp: boolean;
  email?: boolean;
  whatsapp?: boolean;
  sms?: boolean;
}

export interface UserPreferencesSettings {
  TRAINING: CategoryPreference;
  ASSESSMENT: CategoryPreference;
  NUTRITION: CategoryPreference;
  CRM: CategoryPreference;
  FINANCE: CategoryPreference;
  SYSTEM: CategoryPreference;
  CAMPAIGN: CategoryPreference;
  MESSAGE: CategoryPreference;
  GAMIFICATION: CategoryPreference;
  MARKETING: CategoryPreference;
}

export const DEFAULT_PREFERENCES: UserPreferencesSettings = {
  TRAINING: { push: true, inApp: true },
  ASSESSMENT: { push: true, inApp: true },
  NUTRITION: { push: true, inApp: true },
  CRM: { push: true, inApp: true },
  FINANCE: { push: true, inApp: true },
  SYSTEM: { push: true, inApp: true },
  CAMPAIGN: { push: true, inApp: true },
  MESSAGE: { push: true, inApp: true },
  GAMIFICATION: { push: true, inApp: true },
  MARKETING: { push: false, inApp: true }
};
