# Dicionário de dados e migrations

Snapshot literal do schema Prisma, sem valores de registros. Inclui modelos compartilhados e periféricos para permitir rastrear relações; inclusão não significa inspeção funcional completa de todo o AtlasFit. `?` é anulável, `[]` é coleção/relação, tipos sem esses marcadores são obrigatórios. `@default`, `@unique`, `@@unique`, `@@index` e `@relation` abaixo registram os defaults, restrições e ações explícitas. Relação sem `onDelete/onUpdate` usa defaults Prisma (confirmar no SQL real); String contendo ID sem `@relation` não cria FK.

## enum GlobalRole

[prisma/schema.prisma:9](<../../../prisma/schema.prisma#L9>)

Valores: SUPERADMIN, TRAINER, STUDENT, USER

## enum WorkspaceRole

[prisma/schema.prisma:16](<../../../prisma/schema.prisma#L16>)

Valores: OWNER, MANAGER, RECEPTIONIST, FINANCE, TRAINER, ASSISTANT, STUDENT

## enum WorkspaceType

[prisma/schema.prisma:26](<../../../prisma/schema.prisma#L26>)

Valores: PERSONAL, GYM

## model User

[prisma/schema.prisma:31](<../../../prisma/schema.prisma#L31>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String? | — |
| email | String? | @unique |
| password | String? | — |
| setupToken | String? | @unique |
| emailVerified | DateTime? | — |
| image | String? | — |
| role | GlobalRole | @default(USER) |
| onboarded | Boolean | @default(false) |
| twoFactorEnabled | Boolean? | — |
| twoFactorSecret | String? | — |
| twoFactorType | String? | @default("EMAIL") |
| twoFactorBackupCodes | String[] | @default([]) |
| threeFactorEnabled | Boolean? | @default(false) |
| isTestAccount | Boolean | @default(false) |
| objective | String? | — |
| gender | String? | — |
| birthDate | DateTime? | — |
| cpfCnpj | String? | — |
| experienceLevel | String? | — |
| medicalConditions | String? | @db.Text |
| weight | Float? | — |
| height | Float? | — |
| accounts | Account[] | — |
| sessions | Session[] | — |
| workspaces | WorkspaceMember[] | — |
| auditLogs | AuditLog[] | — |
| createdExercises | Exercise[] | @relation("CreatedExercises") |
| workouts | Workout[] | @relation("CreatedWorkouts") |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| bio | String? | — |
| specialty | String? | — |
| whatsapp | String? | — |
| instagram | String? | — |
| linkedin | String? | — |
| city | String? | — |
| experience | String? | — |
| cref | String? | — |
| imageKey | String? | — |
| importCredits | Int | @default(0) |
| subscription | Subscription? | — |
| freeTrial | FreeTrial? | — |
| transactions | Transaction[] | — |
| subscriptionActivities | SubscriptionActivity[] | — |
| adjustmentRequests | ExerciseAdjustmentRequest[] | — |
| adjustmentMessages | AdjustmentMessage[] | — |
| studentWorkouts | Workout[] | @relation("StudentWorkouts") |
| progressHistory | StudentProgress[] | — |
| progressPhotos | StudentProgressPhoto[] | — |
| physicalEvaluations | PhysicalEvaluation[] | — |
| studentFiles | StudentFile[] | — |
| workoutLogs | WorkoutLog[] | — |
| studentTasks | TrainerTask[] | @relation("StudentTasks") |
| dailyFeedbacks | DailyFeedback[] | — |
| createdExperiences | EngageExperience[] | @relation("CreatedExperiences") |
| engageStatuses | EngageUserStatus[] | — |
| engageEventLogs | EngageEventLog[] | — |
| leads | Lead[] | — |
| notificationDevices | NotificationDevice[] | — |
| notifications | Notification[] | — |
| notificationPreference | NotificationPreference? | — |
| referralCode | String? | @unique |
| referredById | String? | — |
| referredBy | User? | @relation("UserReferrals", fields: [referredById], references: [id]) |
| referrals | User[] | @relation("UserReferrals") |
| commissionsReceived | ReferralCommission[] | @relation("ReferrerCommissions") |
| commissionsGenerated | ReferralCommission[] | @relation("ReferredCommissions") |
| payoutRequests | PayoutRequest[] | — |
| chatParticipations | ConversationParticipant[] | — |
| chatMessages | Message[] | — |
| dataDeletionRequest | DataDeletionRequest? | — |
| createdImportJobs | ImportJob[] | @relation("CreatedImportJobs") |
| geminiUsageLogs | GeminiUsageLog[] | @relation("GeminiUsageLogs") |
| creditPurchases | CreditPurchase[] | — |
| paymentProviderAccounts | PaymentProviderAccount[] | @relation("PaymentProviderAccounts") |
| studentGymInvoices | GymInvoice[] | @relation("StudentUserGymInvoices") |
| receivedGymPayments | GymPayment[] | @relation("StaffReceivedGymPayments") |
| reversedGymPayments | GymPayment[] | @relation("StaffReversedGymPayments") |
| transfersPerformed | GymAccountTransfer[] | @relation("TransfersPerformed") |
| createdExpenses | GymExpense[] | @relation("CreatedExpenses") |
| paidExpenses | GymExpense[] | @relation("PaidExpenses") |
| cancelledExpenses | GymExpense[] | @relation("CancelledExpenses") |
| cashDrawersOpened | GymCashDrawerSession[] | @relation("CashDrawersOpened") |
| cashDrawersClosed | GymCashDrawerSession[] | @relation("CashDrawersClosed") |
| cashDrawersReconciled | GymCashDrawerSession[] | @relation("CashDrawersReconciled") |
| cashMovementsPerformed | GymCashDrawerMovement[] | @relation("CashMovementsPerformed") |
| roadmapFeatures | RoadmapFeature[] | @relation("RoadmapFeatureAuthor") |
| roadmapOfficialResp | RoadmapFeature[] | @relation("RoadmapOfficialResponseAuthor") |
| roadmapVotes | RoadmapVote[] | — |
| roadmapComments | RoadmapComment[] | — |
| roadmapPollsCreated | RoadmapPoll[] | @relation("RoadmapPollCreator") |
| roadmapPollVotes | RoadmapPollVote[] | — |
| roadmapAuditLogs | RoadmapAuditLog[] | @relation("RoadmapAuditActor") |
| roadmapFeaturesEdited | RoadmapFeature[] | @relation("RoadmapFeatureEditedBy") |
| roadmapCommentsEdited | RoadmapComment[] | @relation("RoadmapCommentEditedBy") |
| trainerVideos | TrainerVideo[] | @relation("TrainerVideos") |
| legalAcceptances | LegalAcceptance[] | — |
| representedLegalAcceptances | LegalAcceptance[] | @relation("RepresentedLegalAcceptances") |
| privacyConsents | PrivacyConsent[] | — |
| dataSubjectRequests | DataSubjectRequest[] | — |
| guardianships | GymGuardian[] | @relation("UserAsGuardian") |
| signedContracts | GymContractAcceptance[] | @relation("SignerUser") |
| representedContracts | GymContractAcceptance[] | @relation("RepresentedStudentUser") |
| billingPayerEnrollments | GymEnrollment[] | @relation("BillingPayerUser") |
| createdPushNotifications | EngagePushNotification[] | @relation("CreatedPushNotifications") |
| pushLogs | EngagePushLog[] | @relation("UserPushLogs") |
| totpDevices | UserTotpDevice[] | — |
| Restrição de modelo | — | @@index([cpfCnpj]) |

## model UserTotpDevice

[prisma/schema.prisma:159](<../../../prisma/schema.prisma#L159>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | — |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| deviceName | String | — |
| secret | String | — |
| lastUsedAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([userId]) |

## model Workspace

[prisma/schema.prisma:172](<../../../prisma/schema.prisma#L172>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String | — |
| slug | String | @unique |
| ownerId | String | — |
| type | WorkspaceType | @default(PERSONAL) |
| isActive | Boolean | @default(true) |
| slogan | String? | — |
| logoUrl | String? | — |
| primaryColor | String? | @default("#ea580c") |
| watermarkUrl | String? | — |
| workoutCoverUrl | String? | — |
| logoKey | String? | — |
| watermarkKey | String? | — |
| workoutCoverKey | String? | — |
| importCredits | Int | @default(0) |
| members | WorkspaceMember[] | — |
| plans | WorkspacePlan[] | — |
| payments | WorkspacePayment[] | — |
| pendingStudents | PendingStudent[] | — |
| trainerTasks | TrainerTask[] | — |
| workouts | Workout[] | — |
| progressHistory | StudentProgress[] | — |
| progressPhotos | StudentProgressPhoto[] | — |
| dailyFeedbacks | DailyFeedback[] | — |
| leads | Lead[] | — |
| tags | Tag[] | — |
| customFields | CustomFieldDefinition[] | — |
| notifications | Notification[] | — |
| engageExperiences | EngageExperience[] | — |
| trainerVideos | TrainerVideo[] | — |
| settings | GymSettings? | — |
| units | GymUnit[] | — |
| guardians | GymGuardian[] | — |
| invitations | WorkspaceInvitation[] | — |
| subscription | WorkspaceSubscription? | — |
| gymPlans | GymPlan[] | — |
| gymEnrollments | GymEnrollment[] | — |
| paymentProviderAccount | PaymentProviderAccount? | @relation("WorkspacePaymentProviderAccount") |
| studentBillings | StudentBilling[] | @relation("WorkspaceStudentBillings") |
| gatewayCustomers | GatewayCustomer[] | @relation("WorkspaceGatewayCustomers") |
| invoices | GymInvoice[] | @relation("WorkspaceGymInvoices") |
| paymentsReceived | GymPayment[] | @relation("WorkspaceGymPayments") |
| financialAccounts | GymFinancialAccount[] | @relation("WorkspaceFinancialAccounts") |
| accountTransfers | GymAccountTransfer[] | @relation("WorkspaceAccountTransfers") |
| expenseCategories | GymExpenseCategory[] | @relation("WorkspaceExpenseCategories") |
| suppliers | GymSupplier[] | @relation("WorkspaceSuppliers") |
| expenses | GymExpense[] | @relation("WorkspaceExpenses") |
| cashDrawerSessions | GymCashDrawerSession[] | @relation("WorkspaceCashDrawerSessions") |
| reconciliationDivergences | GymReconciliationDivergence[] | @relation("WorkspaceReconciliationDivergences") |
| modalities | GymModality[] | @relation("WorkspaceGymModalities") |
| rooms | GymRoom[] | @relation("WorkspaceGymRooms") |
| classSchedules | GymClassSchedule[] | @relation("WorkspaceGymClassSchedules") |
| classSessions | GymClassSession[] | @relation("WorkspaceGymClassSessions") |
| classBookings | GymClassBooking[] | @relation("WorkspaceGymClassBookings") |
| classWaitlists | GymClassWaitlist[] | @relation("WorkspaceGymClassWaitlists") |
| accessGrants | GymAccessGrant[] | @relation("WorkspaceGymAccessGrants") |
| accessOverrides | GymAccessOverride[] | @relation("WorkspaceGymAccessOverrides") |
| accessDecisionLogs | GymAccessDecisionLog[] | @relation("WorkspaceGymAccessDecisionLogs") |
| accessDevices | GymAccessDevice[] | @relation("WorkspaceGymAccessDevices") |
| deviceCommands | GymDeviceCommand[] | @relation("WorkspaceGymDeviceCommands") |
| accessLogs | GymAccessLog[] | @relation("WorkspaceGymAccessLogs") |
| accessReconciliationDivergences | GymAccessReconciliationDivergence[] | @relation("WorkspaceGymAccessReconciliationDivergences") |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| conversations | Conversation[] | — |
| importJobs | ImportJob[] | — |
| creditPurchases | CreditPurchase[] | — |

## model WorkspaceMember

[prisma/schema.prisma:242](<../../../prisma/schema.prisma#L242>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | — |
| workspaceId | String | — |
| role | WorkspaceRole | @default(STUDENT) |
| isActive | Boolean | @default(true) |
| plan | String | @default("Mensal") |
| modality | String | @default("PRESENCIAL") |
| streak | Int | @default(0) |
| bestStreak | Int | @default(0) |
| progress | Int | @default(0) |
| lastActive | DateTime? | @default(now()) |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| billingControlType | String | @default("MANUAL") // "MANUAL", "CONFIRMATION", "AUTOMATIC" |
| billingPrice | Float | @default(0.0) |
| billingPeriodicity | String | @default("MENSAL") // "MENSAL", "QUINZENAL", "SEMANAL", "ANUAL", "PERSONALIZADA" |
| billingCustomIntervalCount | Int? | @default(1) |
| billingCustomIntervalUnit | String? | @default("meses") // "dias", "semanas", "meses", "anos" |
| billingDueDay | Int? | @default(10) |
| billingFirstDueDate | DateTime? | — |
| billingStartDate | DateTime? | — |
| billingLastGeneratedDate | DateTime? | — |
| billingNextDueDate | DateTime? | — |
| billingDescription | String? | @default("Mensalidade de Assessoria") |
| billingCategory | String? | @default("Mensalidade") |
| billingPaymentMethod | String? | @default("PIX") |
| billingIsActive | Boolean | @default(true) |
| billingSource | String? | @default("MANUAL") |
| asaasSubscriptionId | String? | — |
| billingCreatedAt | DateTime? | — |
| planEndDate | DateTime? | — |
| canDoAnyWorkoutDay | Boolean | @default(false) |
| roleGrants | WorkspaceRoleGrant[] | — |
| staffProfile | GymStaffProfile? | — |
| studentProfile | GymStudentProfile? | — |
| unitId | String? | — |
| unit | GymUnit? | @relation("MemberPrimaryUnit", fields: [unitId], references: [id], onDelete: SetNull) |
| assignedStaffId | String? | — |
| assignedStaff | WorkspaceMember? | @relation("StaffAssignedStudents", fields: [assignedStaffId], references: [id], onDelete: SetNull) |
| assignedStudents | WorkspaceMember[] | @relation("StaffAssignedStudents") |
| isMinor | Boolean | @default(false) |
| guardians | GymGuardian[] | @relation("StudentGuardians") |
| gymEnrollments | GymEnrollment[] | — |
| invoices | GymInvoice[] | @relation("StudentMemberInvoices") |
| instructorClassSchedules | GymClassSchedule[] | @relation("InstructorClassSchedules") |
| instructorClassSessions | GymClassSession[] | @relation("InstructorClassSessions") |
| substituteClassSessions | GymClassSession[] | @relation("SubstituteInstructorClassSessions") |
| classBookings | GymClassBooking[] | @relation("StudentClassBookings") |
| classWaitlists | GymClassWaitlist[] | @relation("StudentClassWaitlists") |
| accessGrants | GymAccessGrant[] | @relation("StudentGymAccessGrants") |
| accessOverrides | GymAccessOverride[] | @relation("StudentGymAccessOverrides") |
| accessDecisionLogs | GymAccessDecisionLog[] | @relation("StudentGymAccessDecisionLogs") |
| accessLogs | GymAccessLog[] | @relation("StudentGymAccessLogs") |
| accessReconciliationDivergences | GymAccessReconciliationDivergence[] | @relation("StudentGymAccessReconciliationDivergences") |
| Restrição de modelo | — | @@unique([userId, workspaceId]) |
| Restrição de modelo | — | @@index([unitId]) |
| Restrição de modelo | — | @@index([assignedStaffId]) |

## model Plan

[prisma/schema.prisma:310](<../../../prisma/schema.prisma#L310>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String | — |
| price | Float | — |
| interval | String | @default("month") |
| features | String? | — |
| maxWorkspaces | Int | @default(1) |
| maxStudents | Int? | — |
| importQuota | Int | @default(25) |
| storageLimitMb | Int | @default(1024) |
| paymentMethods | String? | @default("PIX") |
| imageUrl | String? | — |
| subscriptions | Subscription[] | — |
| subscriptionActivities | SubscriptionActivity[] | — |
| workspaceSubscriptions | WorkspaceSubscription[] | — |

## model Subscription

[prisma/schema.prisma:327](<../../../prisma/schema.prisma#L327>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | @unique |
| planId | String | — |
| status | String | — |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| plan | Plan | @relation(fields: [planId], references: [id]) |
| startDate | DateTime | @default(now()) |
| endDate | DateTime? | — |
| isPreSubscription | Boolean | @default(false) |
| importQuotaUsed | Int | @default(0) |
| importQuotaResetAt | DateTime? | — |
| abacateSubscriptionId | String? | @unique |
| abacateCustomerId | String? | — |

## model FreeTrial

[prisma/schema.prisma:343](<../../../prisma/schema.prisma#L343>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | @unique |
| startDate | DateTime | @default(now()) |
| endDate | DateTime | — |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |

## model Transaction

[prisma/schema.prisma:354](<../../../prisma/schema.prisma#L354>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | — |
| amount | Float | — |
| status | String | // "APPROVED", "PENDING", "FAILED", "REFUNDED" |
| paymentMethod | String? | // "CREDIT_CARD", "PIX", "BOLETO" |
| description | String? | — |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| commissions | ReferralCommission[] | — |

## model Coupon

[prisma/schema.prisma:368](<../../../prisma/schema.prisma#L368>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| code | String | @unique |
| discountPercent | Int | — |
| maxUses | Int? | — |
| usedCount | Int | @default(0) |
| expirationDate | DateTime? | — |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

## model AuditLog

[prisma/schema.prisma:380](<../../../prisma/schema.prisma#L380>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String? | — |
| action | String | — |
| entity | String? | — |
| entityId | String? | — |
| ip | String? | — |
| severity | String | @default("info") |
| user | User? | @relation(fields: [userId], references: [id], onDelete: SetNull) |
| createdAt | DateTime | @default(now()) |

## model Account

[prisma/schema.prisma:392](<../../../prisma/schema.prisma#L392>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | — |
| type | String | — |
| provider | String | — |
| providerAccountId | String | — |
| refresh_token | String? | @db.Text |
| access_token | String? | @db.Text |
| expires_at | Int? | — |
| token_type | String? | — |
| scope | String? | — |
| id_token | String? | @db.Text |
| session_state | String? | — |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@unique([provider, providerAccountId]) |

## model Session

[prisma/schema.prisma:411](<../../../prisma/schema.prisma#L411>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| sessionToken | String | @unique |
| userId | String | — |
| expires | DateTime | — |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |

## model VerificationToken

[prisma/schema.prisma:419](<../../../prisma/schema.prisma#L419>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| identifier | String | — |
| token | String | @unique |
| expires | DateTime | — |
| Restrição de modelo | — | @@unique([identifier, token]) |

## model PasswordResetToken

[prisma/schema.prisma:427](<../../../prisma/schema.prisma#L427>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| email | String | — |
| token | String | @unique |
| expires | DateTime | — |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@index([email]) |

## model MuscleGroup

[prisma/schema.prisma:437](<../../../prisma/schema.prisma#L437>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String | @unique |
| exercises | Exercise[] | @relation("SingleGroup") |
| exercisesMany | Exercise[] | @relation("MultiGroups") |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

## model Exercise

[prisma/schema.prisma:446](<../../../prisma/schema.prisma#L446>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String | — |
| creatorId | String? | — |
| videoUrl | String? | — |
| usage | Int | @default(0) |
| isOfficial | Boolean | @default(false) |
| status | String | @default("PENDING") // PENDING, APPROVED, REJECTED |
| muscleGroupId | String | — |
| muscleGroup | MuscleGroup | @relation("SingleGroup", fields: [muscleGroupId], references: [id], onDelete: Cascade) |
| muscleGroups | MuscleGroup[] | @relation("MultiGroups") |
| creator | User? | @relation("CreatedExercises", fields: [creatorId], references: [id], onDelete: SetNull) |
| workoutExercises | WorkoutExercise[] | — |
| adjustmentRequests | ExerciseAdjustmentRequest[] | — |
| trainerVideoLinks | TrainerVideoExercise[] | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

## model TrainerVideo

[prisma/schema.prisma:467](<../../../prisma/schema.prisma#L467>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| title | String | — |
| description | String? | — |
| videoUrl | String | — |
| thumbnailUrl | String? | — |
| storageKey | String? | — |
| fileSize | Int? | — |
| duration | Int? | — |
| sourceType | String | @default("UPLOAD") |
| trainerId | String | — |
| trainer | User | @relation("TrainerVideos", fields: [trainerId], references: [id], onDelete: Cascade) |
| workspaceId | String? | — |
| workspace | Workspace? | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| exerciseLinks | TrainerVideoExercise[] | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([trainerId]) |
| Restrição de modelo | — | @@index([workspaceId]) |

## model TrainerVideoExercise

[prisma/schema.prisma:490](<../../../prisma/schema.prisma#L490>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| videoId | String | — |
| video | TrainerVideo | @relation(fields: [videoId], references: [id], onDelete: Cascade) |
| exerciseId | String | — |
| exercise | Exercise | @relation(fields: [exerciseId], references: [id], onDelete: Cascade) |
| isDefault | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@unique([videoId, exerciseId]) |
| Restrição de modelo | — | @@index([exerciseId]) |
| Restrição de modelo | — | @@index([videoId]) |

## model Workout

[prisma/schema.prisma:505](<../../../prisma/schema.prisma#L505>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String | — |
| goal | String | // "Hipertrofia", "Emagrecimento", "Força", "Resistência", etc. (pra que serve) |
| difficulty | String | // "Iniciante", "Intermediário", "Avançado" |
| duration | String | // "60 min", "45 min" (tempo de treino) |
| creatorId | String? | — |
| creator | User? | @relation("CreatedWorkouts", fields: [creatorId], references: [id], onDelete: SetNull) |
| workspaceId | String? | — |
| workspace | Workspace? | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| exercises | WorkoutExercise[] | — |
| exerciseGroups | WorkoutExerciseGroup[] | — |
| studentId | String? | — |
| student | User? | @relation("StudentWorkouts", fields: [studentId], references: [id], onDelete: Cascade) |
| dayOfWeek | Int? | // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb |
| muscleGroupLabel | String? | // Ex: "Peito e Tríceps", "Membros Inferiores" |
| restBetweenExercises | String? | @default("2 min") |
| isActive | Boolean | @default(true) |
| workoutLogs | WorkoutLog[] | — |
| allowRepsModification | Boolean | @default(true) |
| allowCompleteView | Boolean | @default(false) |
| allowSkipExercises | Boolean | @default(false) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

## model WorkoutExercise

[prisma/schema.prisma:534](<../../../prisma/schema.prisma#L534>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workoutId | String | — |
| exerciseId | String | — |
| sets | Int | // séries |
| reps | String | // repetições |
| rest | String | // descanso |
| load | String? | // carga (peso) prescrita |
| description | String? | // observação do personal para este exercício |
| order | Int | @default(0) // ordem |
| methodType | MethodType | @default(NONE) |
| methodConfig | Json? | — |
| groupId | String? | — |
| group | WorkoutExerciseGroup? | @relation(fields: [groupId], references: [id], onDelete: SetNull) |
| allowRepsModification | Boolean? | — |
| workout | Workout | @relation(fields: [workoutId], references: [id], onDelete: Cascade) |
| exercise | Exercise | @relation(fields: [exerciseId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

## model SystemSetting

[prisma/schema.prisma:557](<../../../prisma/schema.prisma#L557>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| key | String | @unique |
| value | String | — |
| description | String? | — |
| type | String | @default("string") // string, boolean, number |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

## model SubscriptionActivity

[prisma/schema.prisma:567](<../../../prisma/schema.prisma#L567>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | — |
| planId | String | — |
| type | String | // "NEW_SUBSCRIPTION", "RENEWAL", "CANCELLATION", "UPGRADE" |
| amount | Float | — |
| status | String | — |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| plan | Plan | @relation(fields: [planId], references: [id]) |
| createdAt | DateTime | @default(now()) |

## model SystemIntegration

[prisma/schema.prisma:579](<../../../prisma/schema.prisma#L579>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String | — |
| key | String | @unique |
| url | String? | — |
| icon | String | @default("Zap") // Lucide icon name |
| status | String | @default("Operational") |
| latency | String? | — |
| category | String? | — |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

## model ExerciseAdjustmentRequest

[prisma/schema.prisma:593](<../../../prisma/schema.prisma#L593>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| exerciseId | String | — |
| description | String | — |
| requesterId | String | — |
| status | String | @default("PENDING") // PENDING, RESOLVED |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| exercise | Exercise | @relation(fields: [exerciseId], references: [id], onDelete: Cascade) |
| requester | User | @relation(fields: [requesterId], references: [id], onDelete: Cascade) |
| messages | AdjustmentMessage[] | — |
| Restrição de modelo | — | @@index([exerciseId]) |
| Restrição de modelo | — | @@index([requesterId]) |

## model AdjustmentMessage

[prisma/schema.prisma:610](<../../../prisma/schema.prisma#L610>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| requestId | String | — |
| senderId | String | — |
| message | String | — |
| isReadByTrainer | Boolean | @default(true) |
| isReadByAdmin | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| request | ExerciseAdjustmentRequest | @relation(fields: [requestId], references: [id], onDelete: Cascade) |
| sender | User | @relation(fields: [senderId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([requestId]) |
| Restrição de modelo | — | @@index([senderId]) |

## model WorkspacePlan

[prisma/schema.prisma:626](<../../../prisma/schema.prisma#L626>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| name | String | — |
| price | Float | — |
| interval | String | @default("mensal") // "mensal", "trimestral", "semestral", "anual" |
| link | String? | // link base de checkout / pagamento |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |

## model WorkspacePayment

[prisma/schema.prisma:640](<../../../prisma/schema.prisma#L640>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| studentName | String | — |
| planName | String | — |
| amount | Float | — |
| status | String | // "pago", "pendente", "atrasado" |
| method | String | // "PIX", "BOLETO", "CREDIT_CARD" |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| billingOrigin | String | @default("MANUAL") // "MANUAL", "RECURRENCE" |
| billingMode | String | @default("MANUAL") // "MANUAL", "CONFIRMATION", "AUTOMATIC" |
| generatedAt | DateTime? | — |
| paidAt | DateTime? | — |
| paidBy | String? | — |
| actionType | String? | // "AUTOMATIC", "MANUAL" |
| reopenedAt | DateTime? | — |
| reopenedBy | String? | — |
| isAutomaticBilled | Boolean | @default(false) |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |

## model PendingStudent

[prisma/schema.prisma:665](<../../../prisma/schema.prisma#L665>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String | — |
| email | String | @unique |
| password | String? | — |
| whatsapp | String? | — |
| cpfCnpj | String? | — |
| plan | String | @default("Mensal") |
| workspaceId | String | — |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([workspaceId]) |

## model TrainerTask

[prisma/schema.prisma:681](<../../../prisma/schema.prisma#L681>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| title | String | — |
| time | String | // "10:00" etc. |
| type | String | // "avaliação", "financeiro", "check-in", "lembrete" |
| completed | Boolean | @default(false) |
| scheduledDate | String? | // "yyyy-MM-dd" armazenado como string local (sem conversão UTC) |
| studentId | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| student | User? | @relation("StudentTasks", fields: [studentId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([workspaceId]) |
| Restrição de modelo | — | @@index([scheduledDate]) |
| Restrição de modelo | — | @@index([studentId]) |

## model StudentProgress

[prisma/schema.prisma:701](<../../../prisma/schema.prisma#L701>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| studentId | String | — |
| workspaceId | String | — |
| date | DateTime | @default(now()) |
| weight | Float? | // Peso em kg |
| height | Float? | // Altura em cm |
| bodyFat | Float? | // Percentual de Gordura % |
| muscleMass | Float? | // Percentual de Massa Magra % |
| chest | Float? | // Peito |
| waist | Float? | // Cintura |
| abdomen | Float? | // Abdômen |
| hips | Float? | // Quadril |
| rightArm | Float? | // Braço Direito |
| leftArm | Float? | // Braço Esquerdo |
| rightForearm | Float? | // Antebraço Direito |
| leftForearm | Float? | // Antebraço Esquerdo |
| rightThigh | Float? | // Coxa Direita |
| leftThigh | Float? | // Coxa Esquerda |
| rightCalf | Float? | // Panturrilha Direita |
| leftCalf | Float? | // Panturrilha Esquerda |
| notes | String? | // Observações gerais |
| student | User | @relation(fields: [studentId], references: [id], onDelete: Cascade) |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([studentId]) |
| Restrição de modelo | — | @@index([workspaceId]) |

## model StudentProgressPhoto

[prisma/schema.prisma:740](<../../../prisma/schema.prisma#L740>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| studentId | String | — |
| workspaceId | String | — |
| photoUrl | String | — |
| objectKey | String? | — |
| mimeType | String? | — |
| size | Int? | — |
| uploadedBy | String? | — |
| date | DateTime | @default(now()) |
| trainerLiked | Boolean | @default(false) |
| comment | String? | @db.Text |
| student | User | @relation(fields: [studentId], references: [id], onDelete: Cascade) |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([studentId]) |
| Restrição de modelo | — | @@index([workspaceId]) |

## model PhysicalEvaluation

[prisma/schema.prisma:764](<../../../prisma/schema.prisma#L764>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| studentId | String | — |
| workspaceId | String | — |
| date | DateTime | @default(now()) |
| type | String | // "Dobra Cutânea (Pollock 7 Dobras)", "Bioimpedância", etc. |
| weight | Float | — |
| height | Float | — |
| bodyFat | Float? | — |
| muscleMass | Float? | — |
| dobras | Json? | // Armazena as dobras (triceps, peitoral, abdominal, coxa, suprailiaca, etc.) |
| anamnese | Json? | // Respostas do questionário de anamnese |
| circunferencias | Json? | // Medidas das circunferências corporais |
| postural | Json? | // Avaliação postural (fotos, desvios e laudo) |
| dorMobilidade | Json? | // Mapa de dor e limitações de mobilidade |
| testesFisicos | Json? | // Resultados dos testes de flexibilidade, cardio e força |
| notes | String? | @db.Text |
| student | User | @relation(fields: [studentId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([studentId]) |
| Restrição de modelo | — | @@index([workspaceId]) |

## model StudentFile

[prisma/schema.prisma:793](<../../../prisma/schema.prisma#L793>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| studentId | String | — |
| workspaceId | String | — |
| name | String | // Descrição visual / Nome amigável do arquivo |
| category | String | // "exames" \| "dieta_treino" \| "outros" |
| type | String | // "file" \| "link" |
| fileName | String? | // Nome físico do arquivo se for upload |
| fileSize | String? | // Tamanho formatado (ex: "2.4 MB") ou "Link" |
| url | String | // URL do arquivo em nuvem ou URL externa |
| objectKey | String? | — |
| mimeType | String? | — |
| size | Int? | — |
| uploadedBy | String? | — |
| notes | String? | @db.Text |
| student | User | @relation(fields: [studentId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([studentId]) |
| Restrição de modelo | — | @@index([workspaceId]) |

## model WorkoutLog

[prisma/schema.prisma:817](<../../../prisma/schema.prisma#L817>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| studentId | String | — |
| workoutId | String | — |
| workspaceId | String | — |
| completedAt | DateTime | @default(now()) |
| feedback | String? | // Ex: "Treino top", "Fadiguei no supino" |
| effortScore | Int? | // 1 (Muito Fácil) a 5 (Muito Difícil) |
| loads | Json? | // Cargas logadas por exercício/série |
| reps | Json? | // Repetições reais por exercício/série |
| restTimes | Json? | // Tempo de descanso real por série |
| skippedExercises | Json? | // Exercícios pulados e suas justificativas |
| student | User | @relation(fields: [studentId], references: [id], onDelete: Cascade) |
| workout | Workout | @relation(fields: [workoutId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@index([studentId]) |
| Restrição de modelo | — | @@index([workoutId]) |
| Restrição de modelo | — | @@index([workspaceId]) |

## model DailyFeedback

[prisma/schema.prisma:839](<../../../prisma/schema.prisma#L839>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| studentId | String | — |
| workspaceId | String | — |
| energy | Int | — |
| fatigue | Int | — |
| humor | Int | — |
| date | DateTime | @default(now()) |
| student | User | @relation(fields: [studentId], references: [id], onDelete: Cascade) |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([studentId]) |
| Restrição de modelo | — | @@index([workspaceId]) |

## enum MethodType

[prisma/schema.prisma:857](<../../../prisma/schema.prisma#L857>)

Valores: NONE, DROPSET, REST_PAUSE, BISET, TRISET, CIRCUIT

## model WorkoutExerciseGroup

[prisma/schema.prisma:866](<../../../prisma/schema.prisma#L866>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workoutId | String | — |
| type | MethodType | — |
| config | Json? | — |
| workout | Workout | @relation(fields: [workoutId], references: [id], onDelete: Cascade) |
| exercises | WorkoutExercise[] | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

## enum EngageStatus

[prisma/schema.prisma:879](<../../../prisma/schema.prisma#L879>)

Valores: DRAFT, ACTIVE, COMPLETED, ARCHIVED

## enum EngageFormat

[prisma/schema.prisma:886](<../../../prisma/schema.prisma#L886>)

Valores: BANNER, CARD, DRAWER, MODAL, FULLSCREEN

## enum EngageUserStatusType

[prisma/schema.prisma:894](<../../../prisma/schema.prisma#L894>)

Valores: NOT_VIEWED, VIEWED, INTERACTED, PARTICIPATING, COMPLETED, ARCHIVED

## enum EngageEventType

[prisma/schema.prisma:903](<../../../prisma/schema.prisma#L903>)

Valores: VIEW, CLICK, DISMISS, JOIN, COMPLETE

## model EngageExperience

[prisma/schema.prisma:911](<../../../prisma/schema.prisma#L911>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| title | String | — |
| category | String | // Ex: "Conteúdo", "Desafio", "Pesquisa", "Aviso", "Campanha" |
| format | EngageFormat | — |
| status | EngageStatus | @default(DRAFT) |
| priority | Int | @default(0) |
| startDate | DateTime | — |
| endDate | DateTime | — |
| showOnlyOnce | Boolean | @default(false) |
| blocks | Json | — |
| segmentation | Json | — |
| workspaceId | String? | — |
| workspace | Workspace? | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| creatorId | String | — |
| creator | User | @relation("CreatedExperiences", fields: [creatorId], references: [id], onDelete: Cascade) |
| userStatuses | EngageUserStatus[] | — |
| eventLogs | EngageEventLog[] | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([workspaceId]) |
| Restrição de modelo | — | @@index([status]) |
| Restrição de modelo | — | @@index([startDate, endDate]) |

## model EngageBanner

[prisma/schema.prisma:947](<../../../prisma/schema.prisma#L947>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| imageUrl | String | — |
| title | String? | — |
| subtitle | String? | — |
| linkUrl | String? | — |
| buttonText | String? | — |
| targetRole | String | @default("ALL") |
| badgeText | String? | — |
| bgGradient | String? | — |
| isActive | Boolean | @default(true) |
| sortOrder | Int | @default(0) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([targetRole, isActive]) |

## model EngageUserStatus

[prisma/schema.prisma:965](<../../../prisma/schema.prisma#L965>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| experienceId | String | — |
| userId | String | — |
| status | EngageUserStatusType | @default(NOT_VIEWED) |
| firstViewedAt | DateTime? | — |
| lastInteractedAt | DateTime? | — |
| completedAt | DateTime? | — |
| experience | EngageExperience | @relation(fields: [experienceId], references: [id], onDelete: Cascade) |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@unique([experienceId, userId]) |
| Restrição de modelo | — | @@index([userId]) |
| Restrição de modelo | — | @@index([experienceId]) |

## model EngageEventLog

[prisma/schema.prisma:985](<../../../prisma/schema.prisma#L985>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| experienceId | String | — |
| userId | String | — |
| eventType | EngageEventType | — |
| metadata | Json? | // Ex: link clicado, ID do treino aberto |
| createdAt | DateTime | @default(now()) |
| experience | EngageExperience | @relation(fields: [experienceId], references: [id], onDelete: Cascade) |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([experienceId]) |
| Restrição de modelo | — | @@index([userId]) |

## enum PushTriggerType

[prisma/schema.prisma:1000](<../../../prisma/schema.prisma#L1000>)

Valores: SCHEDULED, INACTIVITY, STREAK_SAVER, WORKOUT_COMPLETED, ASSESSMENT_DUE, BROADCAST

## model EngagePushNotification

[prisma/schema.prisma:1009](<../../../prisma/schema.prisma#L1009>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| title | String | — |
| body | String | @db.Text |
| imageUrl | String? | — |
| targetRole | String | @default("ALL") // "ALL", "STUDENT", "TRAINER" |
| targetPlan | String | @default("ALL") // "ALL", "FREE_TRIAL", "ACTIVE_SUBSCRIPTION" |
| triggerType | PushTriggerType | @default(SCHEDULED) |
| deepLink | String | @default("/student/workouts") |
| category | String | @default("TRAINING") // "TRAINING", "SYSTEM", "MARKETING", "GAMIFICATION" |
| titleB | String? | — |
| bodyB | String? | @db.Text |
| sentCountB | Int | @default(0) |
| clickCountB | Int | @default(0) |
| conversionCountB | Int | @default(0) |
| scheduleTime | String? | // Ex: "18:00" ou "08:00" |
| daysOfWeek | String? | // Ex: "1,2,3,4,5" (0=Dom, 1=Seg...) |
| inactivityDays | Int? | // Ex: 3 (após 3 dias sem treino) |
| targetWithWorkout | Boolean | @default(true) // Alunos com treino no dia |
| targetWithoutWorkout | Boolean | @default(true) // Alunos sem treino no dia |
| onlyNotTrainedToday | Boolean | @default(false) // Apenas quem ainda NÃO treinou hoje |
| isActive | Boolean | @default(true) |
| priority | String | @default("HIGH") // "HIGH", "NORMAL" |
| sentCount | Int | @default(0) |
| deliveredCount | Int | @default(0) |
| clickCount | Int | @default(0) |
| conversionCount | Int | @default(0) |
| creatorId | String? | — |
| creator | User? | @relation("CreatedPushNotifications", fields: [creatorId], references: [id], onDelete: SetNull) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| logs | EngagePushLog[] | — |
| Restrição de modelo | — | @@index([triggerType, isActive]) |
| Restrição de modelo | — | @@index([targetRole]) |

## model EngagePushLog

[prisma/schema.prisma:1059](<../../../prisma/schema.prisma#L1059>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| notificationId | String | — |
| userId | String | — |
| variant | String | @default("A") // "A" ou "B" |
| status | String | // "SENT", "DELIVERED", "FAILED", "CLICKED", "CONVERTED" |
| errorReason | String? | — |
| clickedAt | DateTime? | — |
| convertedAt | DateTime? | — |
| sentAt | DateTime | @default(now()) |
| notification | EngagePushNotification | @relation(fields: [notificationId], references: [id], onDelete: Cascade) |
| user | User | @relation("UserPushLogs", fields: [userId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([userId]) |
| Restrição de modelo | — | @@index([notificationId]) |
| Restrição de modelo | — | @@index([sentAt]) |
| Restrição de modelo | — | @@index([status]) |

## model Lead

[prisma/schema.prisma:1079](<../../../prisma/schema.prisma#L1079>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| ownerId | String | — |
| name | String | — |
| phone | String? | — |
| whatsapp | String? | — |
| email | String? | — |
| instagram | String? | — |
| goal | String? | — |
| source | String? | — |
| notes | String? | @db.Text |
| potentialValue | Float? | — |
| status | String | — |
| lostReason | String? | — |
| lostReasonDetails | String? | @db.Text |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| owner | User | @relation(fields: [ownerId], references: [id], onDelete: Cascade) |
| activities | LeadActivity[] | — |
| tasks | LeadTask[] | — |
| tags | Tag[] | — |
| customValues | CustomFieldValue[] | — |
| files | LeadFile[] | — |
| Restrição de modelo | — | @@index([workspaceId]) |
| Restrição de modelo | — | @@index([ownerId]) |
| Restrição de modelo | — | @@index([status]) |

## model LeadActivity

[prisma/schema.prisma:1111](<../../../prisma/schema.prisma#L1111>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| leadId | String | — |
| content | String | @db.Text |
| createdAt | DateTime | @default(now()) |
| lead | Lead | @relation(fields: [leadId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([leadId]) |

## model LeadTask

[prisma/schema.prisma:1122](<../../../prisma/schema.prisma#L1122>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| leadId | String | — |
| title | String | — |
| status | String | @default("PENDING") |
| dueDate | DateTime? | — |
| time | String? | @default("09:00") |
| priority | String | @default("MEDIA") |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| lead | Lead | @relation(fields: [leadId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([leadId]) |

## model Tag

[prisma/schema.prisma:1138](<../../../prisma/schema.prisma#L1138>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| name | String | — |
| color | String | — |
| createdAt | DateTime | @default(now()) |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| leads | Lead[] | — |
| Restrição de modelo | — | @@unique([workspaceId, name]) |
| Restrição de modelo | — | @@index([workspaceId]) |

## model CustomFieldDefinition

[prisma/schema.prisma:1152](<../../../prisma/schema.prisma#L1152>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| name | String | — |
| type | String | @default("text") |
| options | String? | — |
| createdAt | DateTime | @default(now()) |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| values | CustomFieldValue[] | — |
| Restrição de modelo | — | @@unique([workspaceId, name]) |
| Restrição de modelo | — | @@index([workspaceId]) |

## model CustomFieldValue

[prisma/schema.prisma:1167](<../../../prisma/schema.prisma#L1167>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| leadId | String | — |
| fieldDefinitionId | String | — |
| value | String | — |
| lead | Lead | @relation(fields: [leadId], references: [id], onDelete: Cascade) |
| definition | CustomFieldDefinition | @relation(fields: [fieldDefinitionId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@unique([leadId, fieldDefinitionId]) |
| Restrição de modelo | — | @@index([leadId]) |
| Restrição de modelo | — | @@index([fieldDefinitionId]) |

## model LeadFile

[prisma/schema.prisma:1181](<../../../prisma/schema.prisma#L1181>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| leadId | String | — |
| fileName | String | — |
| fileSize | String | — |
| url | String | — |
| objectKey | String? | — |
| mimeType | String? | — |
| size | Int? | — |
| uploadedBy | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| lead | Lead | @relation(fields: [leadId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([leadId]) |

## model NotificationDevice

[prisma/schema.prisma:1199](<../../../prisma/schema.prisma#L1199>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | — |
| firebaseToken | String | @unique |
| platform | String? | — |
| browser | String? | — |
| status | String | @default("ACTIVE") |
| lastSeen | DateTime | @default(now()) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([userId]) |

## model Notification

[prisma/schema.prisma:1214](<../../../prisma/schema.prisma#L1214>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | — |
| type | String | — |
| category | String | — |
| title | String | — |
| description | String | — |
| image | String? | — |
| icon | String? | — |
| priority | String | @default("NORMAL") |
| payload | Json? | — |
| deepLink | String? | — |
| source | String? | — |
| isRead | Boolean | @default(false) |
| delivered | Boolean | @default(false) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| readAt | DateTime? | — |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| workspaceId | String? | — |
| workspace | Workspace? | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([userId]) |
| Restrição de modelo | — | @@index([isRead]) |
| Restrição de modelo | — | @@index([workspaceId]) |

## model NotificationPreference

[prisma/schema.prisma:1241](<../../../prisma/schema.prisma#L1241>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | @unique |
| settings | Json | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |

## model ReferralCommission

[prisma/schema.prisma:1250](<../../../prisma/schema.prisma#L1250>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| referrerId | String | — |
| referredId | String | — |
| transactionId | String | — |
| amount | Float | — |
| percentage | Float | — |
| status | String | // "PENDENTE", "APROVADO", "CANCELADO" |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| referrer | User | @relation("ReferrerCommissions", fields: [referrerId], references: [id], onDelete: Cascade) |
| referred | User | @relation("ReferredCommissions", fields: [referredId], references: [id], onDelete: Cascade) |
| transaction | Transaction | @relation(fields: [transactionId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([referrerId]) |
| Restrição de modelo | — | @@index([referredId]) |
| Restrição de modelo | — | @@index([transactionId]) |

## model PayoutRequest

[prisma/schema.prisma:1270](<../../../prisma/schema.prisma#L1270>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | — |
| amount | Float | — |
| pixKey | String | — |
| pixKeyType | String | — |
| status | String | // "PENDENTE", "PAGO", "REJEITADO" |
| rejectedReason | String? | — |
| paidAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([userId]) |

## enum ChatType

[prisma/schema.prisma:1287](<../../../prisma/schema.prisma#L1287>)

Valores: DIRECT, GROUP, WHATSAPP, INSTAGRAM

## enum MessageType

[prisma/schema.prisma:1294](<../../../prisma/schema.prisma#L1294>)

Valores: TEXT, IMAGE, VIDEO, FILE, AUDIO

## enum MessageStatus

[prisma/schema.prisma:1302](<../../../prisma/schema.prisma#L1302>)

Valores: SENDING, SENT, DELIVERED, READ

## model Conversation

[prisma/schema.prisma:1309](<../../../prisma/schema.prisma#L1309>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| type | ChatType | @default(DIRECT) |
| lastMessage | String? | @db.Text |
| lastMessageAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| participants | ConversationParticipant[] | — |
| messages | Message[] | — |
| Restrição de modelo | — | @@index([workspaceId]) |

## model ConversationParticipant

[prisma/schema.prisma:1324](<../../../prisma/schema.prisma#L1324>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| conversationId | String | — |
| userId | String | — |
| role | String | @default("MEMBER") |
| unreadCount | Int | @default(0) |
| joinedAt | DateTime | @default(now()) |
| leftAt | DateTime? | — |
| conversation | Conversation | @relation(fields: [conversationId], references: [id], onDelete: Cascade) |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@unique([conversationId, userId]) |
| Restrição de modelo | — | @@index([conversationId]) |
| Restrição de modelo | — | @@index([userId]) |

## model Message

[prisma/schema.prisma:1340](<../../../prisma/schema.prisma#L1340>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| conversationId | String | — |
| senderId | String | — |
| type | MessageType | @default(TEXT) |
| content | String? | @db.Text |
| attachment | Json? | — |
| replyToId | String? | — |
| status | MessageStatus | @default(SENDING) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| conversation | Conversation | @relation(fields: [conversationId], references: [id], onDelete: Cascade) |
| sender | User | @relation(fields: [senderId], references: [id], onDelete: Cascade) |
| replyTo | Message? | @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull) |
| replies | Message[] | @relation("MessageReplies") |
| Restrição de modelo | — | @@index([conversationId]) |
| Restrição de modelo | — | @@index([senderId]) |
| Restrição de modelo | — | @@index([replyToId]) |

## model DataDeletionRequest

[prisma/schema.prisma:1362](<../../../prisma/schema.prisma#L1362>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | @unique |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| status | String | @default("PENDING") // PENDING, COMPLETED, REJECTED |
| requestedAt | DateTime | @default(now()) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([status]) |

## enum ImportJobStatus

[prisma/schema.prisma:1374](<../../../prisma/schema.prisma#L1374>)

Valores: UPLOADED, PROCESSING, REVIEW, READY, IMPORTING, COMPLETED, PARTIAL, FAILED, CANCELLED

## enum ImportProcessingStep

[prisma/schema.prisma:1386](<../../../prisma/schema.prisma#L1386>)

Valores: IDLE, PARSING, EXTRACTING, NORMALIZING, MATCHING, PREPARING_REVIEW, COMMITTING

## enum ImportSourceType

[prisma/schema.prisma:1396](<../../../prisma/schema.prisma#L1396>)

Valores: MIXED, PDF, IMAGE, TEXT, SPREADSHEET

## enum ImportSourceStatus

[prisma/schema.prisma:1404](<../../../prisma/schema.prisma#L1404>)

Valores: PENDING, PARSED, EXTRACTED, FAILED

## enum ImportRecordStatus

[prisma/schema.prisma:1411](<../../../prisma/schema.prisma#L1411>)

Valores: EXTRACTED, VALIDATED, INVALID, READY, COMMITTED, SKIPPED, FAILED

## enum ImportReviewStatus

[prisma/schema.prisma:1421](<../../../prisma/schema.prisma#L1421>)

Valores: NOT_REQUIRED, PENDING, APPROVED, EDITED

## enum ImportRecordSource

[prisma/schema.prisma:1428](<../../../prisma/schema.prisma#L1428>)

Valores: AI_EXTRACTED, DETERMINISTIC, USER_EDITED

## enum ImportEntityType

[prisma/schema.prisma:1434](<../../../prisma/schema.prisma#L1434>)

Valores: STUDENT, WORKOUT, EXERCISE, ASSESSMENT, MEASUREMENT

## enum ImportEntityAction

[prisma/schema.prisma:1442](<../../../prisma/schema.prisma#L1442>)

Valores: CREATED, UPDATED

## enum DeduplicationMatchLevel

[prisma/schema.prisma:1447](<../../../prisma/schema.prisma#L1447>)

Valores: EXACT_MATCH, PROBABLE_MATCH, NO_MATCH

## model ImportJob

[prisma/schema.prisma:1453](<../../../prisma/schema.prisma#L1453>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| createdByUserId | String? | — |
| sourceType | ImportSourceType | @default(MIXED) |
| sourcePlatform | String? | — |
| status | ImportJobStatus | @default(UPLOADED) |
| processingStep | ImportProcessingStep | @default(IDLE) |
| totalStudents | Int | @default(0) |
| totalWorkouts | Int | @default(0) |
| totalExercises | Int | @default(0) |
| totalAssessments | Int | @default(0) |
| totalMeasurements | Int | @default(0) |
| promptVersion | String | @default("migration-extraction-v1") |
| schemaVersion | String | @default("migration-v1") |
| modelPrimary | String | @default("gemini-3.5-flash-lite") |
| modelFallback | String | @default("gemini-3.6-flash") |
| commitVersion | Int | @default(1) |
| idempotencyKey | String? | @unique |
| previewValidated | Boolean | @default(false) |
| errorCode | String? | — |
| safeErrorMessage | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| createdByUser | User? | @relation("CreatedImportJobs", fields: [createdByUserId], references: [id], onDelete: SetNull) |
| sources | ImportSource[] | — |
| records | ImportRecord[] | — |
| usageLogs | GeminiUsageLog[] | — |
| entityResults | ImportEntityResult[] | — |
| Restrição de modelo | — | @@index([workspaceId]) |
| Restrição de modelo | — | @@index([createdByUserId]) |
| Restrição de modelo | — | @@index([status]) |

## model ImportSource

[prisma/schema.prisma:1498](<../../../prisma/schema.prisma#L1498>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| importJobId | String | — |
| type | ImportSourceType | — |
| status | ImportSourceStatus | @default(PENDING) |
| sortOrder | Int | @default(0) |
| originalName | String? | — |
| mimeType | String? | — |
| extension | String? | — |
| sizeBytes | Int? | — |
| storageKey | String? | — |
| textContent | String? | @db.Text |
| sha256 | String? | — |
| geminiFileName | String? | — |
| geminiFileExpiresAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| importJob | ImportJob | @relation(fields: [importJobId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([importJobId]) |
| Restrição de modelo | — | @@index([sha256]) |

## model ImportRecord

[prisma/schema.prisma:1526](<../../../prisma/schema.prisma#L1526>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| importJobId | String | — |
| entityType | ImportEntityType | — |
| temporaryEntityId | String | — |
| sourceData | Json? | — |
| normalizedData | Json? | — |
| status | ImportRecordStatus | @default(EXTRACTED) |
| reviewStatus | ImportReviewStatus | @default(NOT_REQUIRED) |
| source | ImportRecordSource | @default(AI_EXTRACTED) |
| confidence | Float? | — |
| evidence | Json? | — |
| deduplicationMatch | DeduplicationMatchLevel | @default(NO_MATCH) |
| matchedEntityId | String? | — |
| errorCode | String? | — |
| safeErrorMessage | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| importJob | ImportJob | @relation(fields: [importJobId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([importJobId]) |
| Restrição de modelo | — | @@index([entityType]) |
| Restrição de modelo | — | @@index([status]) |
| Restrição de modelo | — | @@index([reviewStatus]) |

## model ImportEntityResult

[prisma/schema.prisma:1560](<../../../prisma/schema.prisma#L1560>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| importJobId | String | — |
| action | ImportEntityAction | — |
| entityType | ImportEntityType | — |
| temporaryEntityId | String | — |
| databaseEntityId | String | — |
| createdAt | DateTime | @default(now()) |
| importJob | ImportJob | @relation(fields: [importJobId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@unique([importJobId, entityType, temporaryEntityId]) |
| Restrição de modelo | — | @@index([importJobId]) |
| Restrição de modelo | — | @@index([databaseEntityId]) |

## model GeminiUsageLog

[prisma/schema.prisma:1578](<../../../prisma/schema.prisma#L1578>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| importJobId | String | — |
| userId | String? | — |
| model | String | — |
| purpose | String | — |
| inputTokens | Int | @default(0) |
| outputTokens | Int | @default(0) |
| cachedTokens | Int? | @default(0) |
| thinkingTokens | Int? | @default(0) |
| totalTokens | Int | @default(0) |
| durationMs | Int | — |
| success | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| importJob | ImportJob | @relation(fields: [importJobId], references: [id], onDelete: Cascade) |
| user | User? | @relation("GeminiUsageLogs", fields: [userId], references: [id], onDelete: SetNull) |
| Restrição de modelo | — | @@index([importJobId]) |
| Restrição de modelo | — | @@index([userId]) |

## model CreditPackage

[prisma/schema.prisma:1604](<../../../prisma/schema.prisma#L1604>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String | — |
| description | String? | — |
| credits | Int | — |
| priceInCents | Int | — |
| imageUrl | String? | — |
| abacatePayProductId | String? | @unique |
| isActive | Boolean | @default(true) |
| isHighlighted | Boolean | @default(false) |
| sortOrder | Int | @default(0) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| purchases | CreditPurchase[] | — |

## model CreditPurchase

[prisma/schema.prisma:1620](<../../../prisma/schema.prisma#L1620>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| packageId | String? | — |
| userId | String | — |
| amountInCents | Int | — |
| credits | Int | — |
| status | String | @default("PENDING") |
| abacatePayBillingId | String? | @unique |
| abacatePayUrl | String? | — |
| paidAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| package | CreditPackage? | @relation(fields: [packageId], references: [id], onDelete: SetNull) |
| user | User | @relation(fields: [userId], references: [id]) |
| Restrição de modelo | — | @@index([workspaceId]) |
| Restrição de modelo | — | @@index([userId]) |
| Restrição de modelo | — | @@index([status]) |

## enum PaymentProvider

[prisma/schema.prisma:1642](<../../../prisma/schema.prisma#L1642>)

Valores: ASAAS, EFI

## enum ProviderEnvironment

[prisma/schema.prisma:1647](<../../../prisma/schema.prisma#L1647>)

Valores: SANDBOX, PRODUCTION

## enum FinancialAccountStatus

[prisma/schema.prisma:1652](<../../../prisma/schema.prisma#L1652>)

Valores: NOT_STARTED, ONBOARDING, PENDING_DOCUMENTS, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED, BLOCKED, CLOSED

## enum WalletKycStatus

[prisma/schema.prisma:1664](<../../../prisma/schema.prisma#L1664>)

Valores: NOT_STARTED, PENDING, DOCUMENTS_REQUIRED, UNDER_REVIEW, APPROVED, REJECTED

## enum WalletPaymentMethod

[prisma/schema.prisma:1673](<../../../prisma/schema.prisma#L1673>)

Valores: PIX, PIX_AUTOMATIC, CREDIT_CARD, BOLETO

## enum StudentBillingStatus

[prisma/schema.prisma:1680](<../../../prisma/schema.prisma#L1680>)

Valores: DRAFT, CREATING, PENDING, CONFIRMED, SETTLED, AVAILABLE, OVERDUE, CANCELLED, PARTIALLY_REFUNDED, REFUNDED, CHARGEBACK_REQUESTED, CHARGEBACK_DISPUTE, CHARGEBACKED, FAILED

## enum WalletSubscriptionStatus

[prisma/schema.prisma:1697](<../../../prisma/schema.prisma#L1697>)

Valores: DRAFT, PENDING_AUTHORIZATION, ACTIVE, PAST_DUE, PAUSED, CANCELLED, EXPIRED, FAILED

## enum WalletPayoutStatus

[prisma/schema.prisma:1708](<../../../prisma/schema.prisma#L1708>)

Valores: REQUESTED, RESERVED, SUBMITTED, PROCESSING, COMPLETED, FAILED_RETRYABLE, FAILED_FINAL, CANCELLED, REVERSED

## enum LedgerEntryType

[prisma/schema.prisma:1720](<../../../prisma/schema.prisma#L1720>)

Valores: PAYMENT_CONFIRMED, PAYMENT_SETTLED, PAYMENT_AVAILABLE, GATEWAY_FEE, PLATFORM_FEE, PAYOUT_RESERVED, PAYOUT_COMPLETED, PAYOUT_RELEASED, REFUND, PARTIAL_REFUND, CHARGEBACK, CHARGEBACK_REVERSAL, ADJUSTMENT, ACTIVATION_FEE_RECOVERY

## enum LedgerDirection

[prisma/schema.prisma:1737](<../../../prisma/schema.prisma#L1737>)

Valores: CREDIT, DEBIT

## enum WebhookProcessingStatus

[prisma/schema.prisma:1742](<../../../prisma/schema.prisma#L1742>)

Valores: RECEIVED, QUEUED, PROCESSING, PROCESSED, IGNORED, FAILED_RETRYABLE, FAILED_FINAL

## enum ReconciliationStatus

[prisma/schema.prisma:1752](<../../../prisma/schema.prisma#L1752>)

Valores: RUNNING, MATCHED, DIVERGENCES_FOUND, FAILED

## enum FinancialProfileType

[prisma/schema.prisma:1759](<../../../prisma/schema.prisma#L1759>)

Valores: USER, WORKSPACE

## model PaymentProviderAccount

[prisma/schema.prisma:1764](<../../../prisma/schema.prisma#L1764>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| profileType | FinancialProfileType | @default(USER) |
| personalUserId | String? | @unique |
| personalUser | User? | @relation("PaymentProviderAccounts", fields: [personalUserId], references: [id], onDelete: Restrict) |
| workspaceId | String? | @unique |
| workspace | Workspace? | @relation("WorkspacePaymentProviderAccount", fields: [workspaceId], references: [id], onDelete: Restrict) |
| provider | PaymentProvider | — |
| environment | ProviderEnvironment | — |
| providerAccountId | String | — |
| providerWalletId | String? | — |
| providerCredentialSecretId | String? | — |
| providerApiKeyEncrypted | String? | — |
| providerApiKeyKeyVersion | String? | — |
| status | FinancialAccountStatus | @default(NOT_STARTED) |
| kycStatus | WalletKycStatus | @default(NOT_STARTED) |
| providerStatus | String? | — |
| providerStatusReason | String? | — |
| legalNameMasked | String? | — |
| documentLast4 | String? | — |
| payoutDestinationMasked | String? | — |
| activationFeeTotalInCents | BigInt | @default(0) |
| activationFeeReservedInCents | BigInt | @default(0) |
| activationFeeRecoveredInCents | BigInt | @default(0) |
| activationFeeStatus | String | @default("NOT_APPLICABLE") |
| lastProviderSyncAt | DateTime? | — |
| approvedAt | DateTime? | — |
| suspendedAt | DateTime? | — |
| closedAt | DateTime? | — |
| deletedAt | DateTime? | — |
| balanceSnapshots | WalletBalanceSnapshot[] | — |
| billings | StudentBilling[] | — |
| subscriptions | StudentSubscription[] | — |
| payouts | WalletPayoutRequest[] | — |
| ledgerEntries | WalletLedgerEntry[] | — |
| activationFeeOperations | ActivationFeeRecoveryOperation[] | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@unique([provider, environment, providerAccountId]) |
| Restrição de modelo | — | @@index([status, kycStatus]) |
| Restrição de modelo | — | @@index([profileType, status]) |

## model WalletBalanceSnapshot

[prisma/schema.prisma:1816](<../../../prisma/schema.prisma#L1816>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| providerAccountId | String | — |
| account | PaymentProviderAccount | @relation(fields: [providerAccountId], references: [id], onDelete: Restrict) |
| availableAmountInCents | BigInt | — |
| pendingAmountInCents | BigInt | — |
| blockedAmountInCents | BigInt | @default(0) |
| negativeAmountInCents | BigInt | @default(0) |
| currency | String | @default("BRL") |
| providerSnapshotId | String? | — |
| providerPayloadHash | String? | — |
| capturedAt | DateTime | — |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@index([providerAccountId, capturedAt]) |

## model GatewayCustomer

[prisma/schema.prisma:1835](<../../../prisma/schema.prisma#L1835>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| provider | PaymentProvider | — |
| environment | ProviderEnvironment | — |
| personalUserId | String? | — |
| workspaceId | String? | — |
| workspace | Workspace? | @relation("WorkspaceGatewayCustomers", fields: [workspaceId], references: [id], onDelete: SetNull) |
| studentUserId | String? | — |
| payerUserId | String? | — |
| payerGuardianId | String? | — |
| payerCpfCnpj | String? | — |
| payerNameSnapshot | String? | — |
| providerCustomerId | String | — |
| nameSnapshot | String | — |
| documentLast4 | String? | — |
| deletedAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@unique([provider, environment, personalUserId, studentUserId]) |
| Restrição de modelo | — | @@unique([provider, environment, providerCustomerId]) |
| Restrição de modelo | — | @@index([personalUserId, studentUserId]) |
| Restrição de modelo | — | @@index([workspaceId, payerCpfCnpj]) |
| Restrição de modelo | — | @@index([workspaceId, studentUserId]) |

## model PersonalBillingPlan

[prisma/schema.prisma:1861](<../../../prisma/schema.prisma#L1861>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| personalUserId | String | — |
| name | String | — |
| description | String? | — |
| amountInCents | BigInt | — |
| currency | String | @default("BRL") |
| intervalMonths | Int | @default(1) |
| preferredPaymentMethod | WalletPaymentMethod | — |
| dueDay | Int? | — |
| trialDays | Int | @default(0) |
| isActive | Boolean | @default(true) |
| deletedAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| subscriptions | StudentSubscription[] | — |
| Restrição de modelo | — | @@index([personalUserId, isActive]) |

## model StudentSubscription

[prisma/schema.prisma:1882](<../../../prisma/schema.prisma#L1882>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| providerAccountId | String | — |
| account | PaymentProviderAccount | @relation(fields: [providerAccountId], references: [id], onDelete: Restrict) |
| planId | String | — |
| plan | PersonalBillingPlan | @relation(fields: [planId], references: [id], onDelete: Restrict) |
| studentUserId | String | — |
| providerSubscriptionId | String? | — |
| providerAuthorizationId | String? | — |
| status | WalletSubscriptionStatus | @default(DRAFT) |
| paymentMethod | WalletPaymentMethod | — |
| amountInCentsSnapshot | BigInt | — |
| feeRuleVersionId | String | — |
| currentPeriodStart | DateTime? | — |
| currentPeriodEnd | DateTime? | — |
| nextBillingAt | DateTime? | — |
| pausedAt | DateTime? | — |
| cancelledAt | DateTime? | — |
| cancellationReason | String? | — |
| billings | StudentBilling[] | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([studentUserId, status]) |
| Restrição de modelo | — | @@index([providerAccountId, status, nextBillingAt]) |

## model StudentBilling

[prisma/schema.prisma:1915](<../../../prisma/schema.prisma#L1915>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| providerAccountId | String | — |
| account | PaymentProviderAccount | @relation(fields: [providerAccountId], references: [id], onDelete: Restrict) |
| workspaceId | String? | — |
| workspace | Workspace? | @relation("WorkspaceStudentBillings", fields: [workspaceId], references: [id], onDelete: SetNull) |
| enrollmentId | String? | — |
| enrollment | GymEnrollment? | @relation("EnrollmentBillings", fields: [enrollmentId], references: [id], onDelete: SetNull) |
| subscriptionId | String? | — |
| subscription | StudentSubscription? | @relation(fields: [subscriptionId], references: [id], onDelete: Restrict) |
| studentUserId | String | — |
| gatewayCustomerId | String? | — |
| providerBillingId | String? | — |
| providerStatus | String? | — |
| payerUserId | String? | — |
| payerGuardianId | String? | — |
| payerName | String? | — |
| payerCpfCnpj | String? | — |
| idempotencyKey | String | @unique |
| billingReference | String | @unique |
| title | String | — |
| description | String? | — |
| grossAmountInCents | BigInt | — |
| gatewayFeeEstimatedInCents | BigInt | @default(0) |
| gatewayFeeActualInCents | BigInt? | — |
| platformFeeEstimatedInCents | BigInt | @default(0) |
| platformFeeActualInCents | BigInt? | — |
| personalNetEstimatedInCents | BigInt | — |
| personalNetActualInCents | BigInt? | — |
| currency | String | @default("BRL") |
| feeRuleVersionId | String | — |
| paymentMethod | WalletPaymentMethod | — |
| status | StudentBillingStatus | @default(DRAFT) |
| dueDate | DateTime | — |
| confirmedAt | DateTime? | — |
| settledAt | DateTime? | — |
| availableAt | DateTime? | — |
| paidAt | DateTime? | — |
| overdueAt | DateTime? | — |
| refundedAt | DateTime? | — |
| chargebackAt | DateTime? | — |
| hostedInvoiceUrl | String? | — |
| refundReason | String? | — |
| pixPayloadEncrypted | String? | — |
| pixExpirationAt | DateTime? | — |
| attempts | PaymentAttempt[] | — |
| splits | PaymentSplit[] | — |
| ledgerEntries | WalletLedgerEntry[] | — |
| activationFeeOperations | ActivationFeeRecoveryOperation[] | — |
| gymInvoices | GymInvoice[] | @relation("BillingGymInvoice") |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@unique([providerAccountId, providerBillingId]) |
| Restrição de modelo | — | @@index([studentUserId, status, dueDate]) |
| Restrição de modelo | — | @@index([providerAccountId, status, createdAt]) |
| Restrição de modelo | — | @@index([workspaceId, status]) |
| Restrição de modelo | — | @@index([enrollmentId]) |

## model ActivationFeeRecoveryOperation

[prisma/schema.prisma:1986](<../../../prisma/schema.prisma#L1986>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| providerAccountId | String | — |
| account | PaymentProviderAccount | @relation(fields: [providerAccountId], references: [id], onDelete: Restrict) |
| billingId | String | — |
| billing | StudentBilling | @relation(fields: [billingId], references: [id], onDelete: Restrict) |
| amountInCents | BigInt | — |
| providerTransferId | String? | @unique |
| externalReference | String? | @unique |
| status | String | @default("RESERVED") |
| failureReason | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([providerAccountId, status]) |

## model PaymentAttempt

[prisma/schema.prisma:2005](<../../../prisma/schema.prisma#L2005>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| billingId | String | — |
| billing | StudentBilling | @relation(fields: [billingId], references: [id], onDelete: Restrict) |
| providerAttemptId | String? | — |
| attemptNumber | Int | — |
| status | String | — |
| failureCode | String? | — |
| failureMessageSanitized | String? | — |
| attemptedAt | DateTime | — |
| nextRetryAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@unique([billingId, attemptNumber]) |

## model PaymentSplit

[prisma/schema.prisma:2022](<../../../prisma/schema.prisma#L2022>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| billingId | String | — |
| billing | StudentBilling | @relation(fields: [billingId], references: [id], onDelete: Restrict) |
| receiverType | String | — |
| providerWalletId | String? | — |
| splitType | String | — |
| configuredValue | Decimal | — |
| estimatedAmountInCents | BigInt | — |
| actualAmountInCents | BigInt? | — |
| providerSplitId | String? | — |
| providerStatus | String? | — |
| refusalReason | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([billingId, receiverType]) |

## model WalletLedgerEntry

[prisma/schema.prisma:2042](<../../../prisma/schema.prisma#L2042>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| providerAccountId | String | — |
| account | PaymentProviderAccount | @relation(fields: [providerAccountId], references: [id], onDelete: Restrict) |
| billingId | String? | — |
| billing | StudentBilling? | @relation(fields: [billingId], references: [id], onDelete: Restrict) |
| payoutId | String? | — |
| providerEventId | String? | — |
| providerTransactionId | String? | — |
| idempotencyKey | String | @unique |
| type | LedgerEntryType | — |
| direction | LedgerDirection | — |
| amountInCents | BigInt | — |
| currency | String | @default("BRL") |
| occurredAt | DateTime | — |
| recordedAt | DateTime | @default(now()) |
| reversalOfEntryId | String? | — |
| description | String | — |
| metadataSanitized | Json? | — |
| Restrição de modelo | — | @@index([providerAccountId, occurredAt]) |
| Restrição de modelo | — | @@index([billingId]) |
| Restrição de modelo | — | @@index([payoutId]) |
| Restrição de modelo | — | @@index([providerEventId]) |

## model WalletPayoutRequest

[prisma/schema.prisma:2072](<../../../prisma/schema.prisma#L2072>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| providerAccountId | String | — |
| account | PaymentProviderAccount | @relation(fields: [providerAccountId], references: [id], onDelete: Restrict) |
| requestedByUserId | String | — |
| idempotencyKey | String | @unique |
| amountInCents | BigInt | — |
| currency | String | @default("BRL") |
| destinationMasked | String | — |
| destinationFingerprint | String | — |
| providerTransferId | String? | — |
| providerStatus | String? | — |
| status | WalletPayoutStatus | @default(REQUESTED) |
| failureCode | String? | — |
| failureReasonSanitized | String? | — |
| requestedAt | DateTime | @default(now()) |
| submittedAt | DateTime? | — |
| completedAt | DateTime? | — |
| failedAt | DateTime? | — |
| reversedAt | DateTime? | — |
| Restrição de modelo | — | @@unique([providerAccountId, providerTransferId]) |
| Restrição de modelo | — | @@index([providerAccountId, status, requestedAt]) |

## model PaymentWebhookEvent

[prisma/schema.prisma:2100](<../../../prisma/schema.prisma#L2100>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| provider | PaymentProvider | — |
| environment | ProviderEnvironment | — |
| providerEventId | String | — |
| eventType | String | — |
| resourceType | String? | — |
| resourceId | String? | — |
| authenticityValidated | Boolean | — |
| payloadEncrypted | String? | — |
| payloadHash | String | — |
| processingStatus | WebhookProcessingStatus | @default(RECEIVED) |
| processingAttempts | Int | @default(0) |
| lastErrorSanitized | String? | — |
| receivedAt | DateTime | @default(now()) |
| queuedAt | DateTime? | — |
| processedAt | DateTime? | — |
| Restrição de modelo | — | @@unique([provider, environment, providerEventId]) |
| Restrição de modelo | — | @@index([processingStatus, receivedAt]) |
| Restrição de modelo | — | @@index([resourceType, resourceId]) |

## model FeeRuleVersion

[prisma/schema.prisma:2125](<../../../prisma/schema.prisma#L2125>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| version | Int | @unique |
| paymentMethod | WalletPaymentMethod | — |
| platformPercentage | Decimal | — |
| platformFixedInCents | BigInt | — |
| minPlatformFeeInCents | BigInt? | — |
| maxPlatformFeeInCents | BigInt? | — |
| gatewayFeePolicy | String | — |
| activeFrom | DateTime | — |
| activeUntil | DateTime? | — |
| createdByUserId | String | — |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@index([paymentMethod, activeFrom, activeUntil]) |

## model FinancialReconciliationRun

[prisma/schema.prisma:2142](<../../../prisma/schema.prisma#L2142>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| provider | PaymentProvider | — |
| environment | ProviderEnvironment | — |
| status | ReconciliationStatus | @default(RUNNING) |
| periodStart | DateTime | — |
| periodEnd | DateTime | — |
| checkedResources | Int | @default(0) |
| divergencesFound | Int | @default(0) |
| summary | Json? | — |
| startedAt | DateTime | @default(now()) |
| finishedAt | DateTime? | — |

## model FinancialAuditLog

[prisma/schema.prisma:2156](<../../../prisma/schema.prisma#L2156>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| actorUserId | String? | — |
| actorType | String | — |
| action | String | — |
| resourceType | String | — |
| resourceId | String | — |
| ipHash | String? | — |
| userAgentSanitized | String? | — |
| metadataSanitized | Json? | — |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@index([resourceType, resourceId, createdAt]) |
| Restrição de modelo | — | @@index([actorUserId, createdAt]) |

## model RoadmapStatus

[prisma/schema.prisma:2172](<../../../prisma/schema.prisma#L2172>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String | — |
| slug | String | @unique |
| color | String | @default("amber") |
| position | Int | @default(0) |
| isPublic | Boolean | @default(true) |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| features | RoadmapFeature[] | — |

## model RoadmapCategory

[prisma/schema.prisma:2185](<../../../prisma/schema.prisma#L2185>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String | — |
| slug | String | @unique |
| icon | String? | — |
| position | Int | @default(0) |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| features | RoadmapFeature[] | — |

## model RoadmapFeature

[prisma/schema.prisma:2197](<../../../prisma/schema.prisma#L2197>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| title | String | — |
| slug | String | @unique |
| description | String | @db.Text |
| authorId | String? | — |
| author | User? | @relation("RoadmapFeatureAuthor", fields: [authorId], references: [id], onDelete: SetNull) |
| statusId | String | — |
| status | RoadmapStatus | @relation(fields: [statusId], references: [id]) |
| categoryId | String? | — |
| category | RoadmapCategory? | @relation(fields: [categoryId], references: [id], onDelete: SetNull) |
| source | String | @default("COMMUNITY") |
| visibility | String | @default("PUBLIC") |
| priority | String? | @default("MEDIUM") |
| featured | Boolean | @default(false) |
| isCommunityChoice | Boolean | @default(false) |
| voteCount | Int | @default(0) |
| commentCount | Int | @default(0) |
| officialResponse | String? | @db.Text |
| officialResponseAt | DateTime? | — |
| officialResponseById | String? | — |
| officialResponseBy | User? | @relation("RoadmapOfficialResponseAuthor", fields: [officialResponseById], references: [id], onDelete: SetNull) |
| estimatedRelease | String? | — |
| releasedAt | DateTime? | — |
| rank | Float | @default(0) |
| mergedIntoId | String? | — |
| editedAt | DateTime? | — |
| editedById | String? | — |
| editedBy | User? | @relation("RoadmapFeatureEditedBy", fields: [editedById], references: [id], onDelete: SetNull) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| deletedAt | DateTime? | — |
| votes | RoadmapVote[] | — |
| comments | RoadmapComment[] | — |
| Restrição de modelo | — | @@index([statusId, rank]) |
| Restrição de modelo | — | @@index([categoryId]) |
| Restrição de modelo | — | @@index([authorId]) |
| Restrição de modelo | — | @@index([slug]) |
| Restrição de modelo | — | @@index([visibility]) |

## model RoadmapVote

[prisma/schema.prisma:2240](<../../../prisma/schema.prisma#L2240>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| featureId | String | — |
| feature | RoadmapFeature | @relation(fields: [featureId], references: [id], onDelete: Cascade) |
| userId | String | — |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@unique([featureId, userId]) |
| Restrição de modelo | — | @@index([userId]) |

## model RoadmapComment

[prisma/schema.prisma:2252](<../../../prisma/schema.prisma#L2252>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| featureId | String | — |
| feature | RoadmapFeature | @relation(fields: [featureId], references: [id], onDelete: Cascade) |
| authorId | String | — |
| author | User | @relation(fields: [authorId], references: [id], onDelete: Cascade) |
| parentId | String? | — |
| parent | RoadmapComment? | @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade) |
| replies | RoadmapComment[] | @relation("CommentReplies") |
| content | String | @db.Text |
| isOfficial | Boolean | @default(false) |
| isModerated | Boolean | @default(false) |
| editedAt | DateTime? | — |
| editedById | String? | — |
| editedBy | User? | @relation("RoadmapCommentEditedBy", fields: [editedById], references: [id], onDelete: SetNull) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| deletedAt | DateTime? | — |
| Restrição de modelo | — | @@index([featureId, createdAt]) |
| Restrição de modelo | — | @@index([authorId]) |
| Restrição de modelo | — | @@index([parentId]) |

## model RoadmapPoll

[prisma/schema.prisma:2276](<../../../prisma/schema.prisma#L2276>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| title | String | — |
| description | String? | @db.Text |
| status | String | @default("ACTIVE") |
| startsAt | DateTime | @default(now()) |
| endsAt | DateTime? | — |
| resultVisibility | String | @default("PUBLIC") |
| allowVoteChange | Boolean | @default(true) |
| createdById | String | — |
| createdBy | User | @relation("RoadmapPollCreator", fields: [createdById], references: [id]) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| options | RoadmapPollOption[] | — |
| votes | RoadmapPollVote[] | — |

## model RoadmapPollOption

[prisma/schema.prisma:2294](<../../../prisma/schema.prisma#L2294>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| pollId | String | — |
| poll | RoadmapPoll | @relation(fields: [pollId], references: [id], onDelete: Cascade) |
| title | String | — |
| position | Int | @default(0) |
| voteCount | Int | @default(0) |
| votes | RoadmapPollVote[] | — |

## model RoadmapPollVote

[prisma/schema.prisma:2305](<../../../prisma/schema.prisma#L2305>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| pollId | String | — |
| poll | RoadmapPoll | @relation(fields: [pollId], references: [id], onDelete: Cascade) |
| optionId | String | — |
| option | RoadmapPollOption | @relation(fields: [optionId], references: [id], onDelete: Cascade) |
| userId | String | — |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@unique([pollId, userId]) |
| Restrição de modelo | — | @@index([optionId]) |
| Restrição de modelo | — | @@index([userId]) |

## model RoadmapAuditLog

[prisma/schema.prisma:2320](<../../../prisma/schema.prisma#L2320>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| actorId | String | — |
| actor | User | @relation("RoadmapAuditActor", fields: [actorId], references: [id]) |
| action | String | — |
| entity | String | — |
| entityId | String | — |
| metadata | String? | @db.Text |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@index([actorId]) |
| Restrição de modelo | — | @@index([entity, entityId]) |

## enum LegalDocumentType

[prisma/schema.prisma:2338](<../../../prisma/schema.prisma#L2338>)

Valores: TERMS, PRIVACY, COOKIES, DPA

## enum LegalDocumentStatus

[prisma/schema.prisma:2345](<../../../prisma/schema.prisma#L2345>)

Valores: DRAFT, PUBLISHED, ARCHIVED

## enum LegalAcceptanceType

[prisma/schema.prisma:2351](<../../../prisma/schema.prisma#L2351>)

Valores: TERMS_ACCEPTED, PRIVACY_ACKNOWLEDGED, COOKIE_CONSENT, REACCEPTANCE

## enum DataSubjectRequestType

[prisma/schema.prisma:2358](<../../../prisma/schema.prisma#L2358>)

Valores: ACCESS, CORRECTION, DELETION, PORTABILITY, CONSENT_REVOCATION, INFORMATION, OBJECTION, OTHER

## enum DataSubjectRequestStatus

[prisma/schema.prisma:2369](<../../../prisma/schema.prisma#L2369>)

Valores: PENDING, IN_REVIEW, IDENTITY_VERIFICATION, PROCESSING, COMPLETED, REJECTED, PARTIALLY_COMPLETED

## enum SecurityIncidentSeverity

[prisma/schema.prisma:2379](<../../../prisma/schema.prisma#L2379>)

Valores: LOW, MEDIUM, HIGH, CRITICAL

## enum SecurityIncidentStatus

[prisma/schema.prisma:2386](<../../../prisma/schema.prisma#L2386>)

Valores: DETECTED, INVESTIGATING, CONTAINED, MITIGATED, RESOLVED, CLOSED

## model LegalDocument

[prisma/schema.prisma:2395](<../../../prisma/schema.prisma#L2395>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| type | LegalDocumentType | — |
| version | String | // Ex: "1.0", "1.1", "2.0" |
| title | String | — |
| content | String | @db.Text |
| contentHash | String | // SHA-256 hash of the exact published content |
| status | LegalDocumentStatus | @default(DRAFT) |
| publishedAt | DateTime? | — |
| effectiveAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| acceptances | LegalAcceptance[] | — |
| Restrição de modelo | — | @@unique([type, version]) |
| Restrição de modelo | — | @@index([type, status]) |

## model LegalAcceptance

[prisma/schema.prisma:2414](<../../../prisma/schema.prisma#L2414>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | — |
| representedUserId | String? | — |
| representationRole | String? | — |
| documentId | String | — |
| documentType | LegalDocumentType | — |
| documentVersion | String | — |
| documentHash | String | — |
| acceptanceType | LegalAcceptanceType | @default(TERMS_ACCEPTED) |
| acceptedAt | DateTime | @default(now()) |
| ipAddress | String? | — |
| userAgent | String? | @db.Text |
| locale | String? | @default("pt-BR") |
| source | String? | @default("WEB") |
| workspaceId | String? | — |
| createdAt | DateTime | @default(now()) |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| representedUser | User? | @relation("RepresentedLegalAcceptances", fields: [representedUserId], references: [id], onDelete: SetNull) |
| document | LegalDocument | @relation(fields: [documentId], references: [id], onDelete: Restrict) |
| Restrição de modelo | — | @@index([userId, documentType]) |
| Restrição de modelo | — | @@index([representedUserId]) |
| Restrição de modelo | — | @@index([documentId]) |
| Restrição de modelo | — | @@index([acceptedAt]) |

## model PrivacyConsent

[prisma/schema.prisma:2442](<../../../prisma/schema.prisma#L2442>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String | — |
| purpose | String | — |
| grantedAt | DateTime | @default(now()) |
| revokedAt | DateTime? | — |
| documentVersion | String? | — |
| source | String? | @default("WEB_SETTINGS") |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| user | User | @relation(fields: [userId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@unique([userId, purpose]) |
| Restrição de modelo | — | @@index([userId]) |

## model DataSubjectRequest

[prisma/schema.prisma:2459](<../../../prisma/schema.prisma#L2459>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| requesterUserId | String | — |
| workspaceId | String? | — |
| type | DataSubjectRequestType | — |
| status | DataSubjectRequestStatus | @default(PENDING) |
| requestedAt | DateTime | @default(now()) |
| completedAt | DateTime? | — |
| rejectedAt | DateTime? | — |
| rejectionReason | String? | @db.Text |
| handledBy | String? | — |
| notes | String? | @db.Text |
| metadata | Json? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| requester | User | @relation(fields: [requesterUserId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([requesterUserId]) |
| Restrição de modelo | — | @@index([status, type]) |

## model SecurityIncident

[prisma/schema.prisma:2481](<../../../prisma/schema.prisma#L2481>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| title | String | — |
| detectedAt | DateTime | @default(now()) |
| confirmedAt | DateTime? | — |
| severity | SecurityIncidentSeverity | @default(MEDIUM) |
| status | SecurityIncidentStatus | @default(DETECTED) |
| affectedSystems | String? | @db.Text |
| dataCategories | String? | @db.Text |
| affectedUsersCount | Int | @default(0) |
| description | String | @db.Text |
| containmentActions | String? | @db.Text |
| mitigationActions | String? | @db.Text |
| notificationRequired | Boolean | @default(false) |
| notificationAt | DateTime? | — |
| resolvedAt | DateTime? | — |
| closedAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([status, severity]) |

## model GymSettings

[prisma/schema.prisma:2504](<../../../prisma/schema.prisma#L2504>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | @unique |
| timezone | String | @default("America/Sao_Paulo") |
| operatingHours | Json? | — |
| billingGracePeriodDays | Int | @default(5) |
| capacityLimit | Int? | — |
| allowMinorSelfCheckin | Boolean | @default(false) |
| requireGuardianSignature | Boolean | @default(true) |
| biometricValidationMode | String | @default("LOCAL_AGENT") |
| maxReceptionistDiscountPercentage | Float | @default(10.0) |
| maxReceptionistDiscountInCents | BigInt | @default(2000) |
| version | Int | @default(1) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |

## model GymUnit

[prisma/schema.prisma:2523](<../../../prisma/schema.prisma#L2523>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| name | String | — |
| slug | String? | — |
| code | String? | — |
| address | String? | — |
| city | String? | — |
| state | String? | — |
| postalCode | String? | — |
| phone | String? | — |
| email | String? | — |
| timezone | String | @default("America/Sao_Paulo") |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| roleGrants | WorkspaceRoleGrant[] | — |
| invitations | WorkspaceInvitation[] | — |
| members | WorkspaceMember[] | @relation("MemberPrimaryUnit") |
| enrollments | GymEnrollment[] | — |
| financialAccounts | GymFinancialAccount[] | — |
| expenses | GymExpense[] | — |
| cashDrawerSessions | GymCashDrawerSession[] | — |
| rooms | GymRoom[] | @relation("UnitGymRooms") |
| classSchedules | GymClassSchedule[] | @relation("UnitGymClassSchedules") |
| classSessions | GymClassSession[] | @relation("UnitGymClassSessions") |
| accessOverrides | GymAccessOverride[] | @relation("UnitGymAccessOverrides") |
| accessDecisionLogs | GymAccessDecisionLog[] | @relation("UnitGymAccessDecisionLogs") |
| devices | GymAccessDevice[] | @relation("UnitGymAccessDevices") |
| accessLogs | GymAccessLog[] | @relation("UnitGymAccessLogs") |
| accessReconciliationDivergences | GymAccessReconciliationDivergence[] | @relation("UnitGymAccessReconciliationDivergences") |
| Restrição de modelo | — | @@unique([workspaceId, slug]) |
| Restrição de modelo | — | @@index([workspaceId, isActive]) |

## model WorkspaceRoleGrant

[prisma/schema.prisma:2561](<../../../prisma/schema.prisma#L2561>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| memberId | String | — |
| role | WorkspaceRole | — |
| unitId | String? | — |
| grantedBy | String? | — |
| grantedAt | DateTime | @default(now()) |
| revokedAt | DateTime? | — |
| revokedBy | String? | — |
| member | WorkspaceMember | @relation(fields: [memberId], references: [id], onDelete: Cascade) |
| unit | GymUnit? | @relation(fields: [unitId], references: [id], onDelete: SetNull) |
| Restrição de modelo | — | @@unique([memberId, role, unitId]) |
| Restrição de modelo | — | @@index([memberId]) |
| Restrição de modelo | — | @@index([unitId]) |

## model WorkspaceInvitation

[prisma/schema.prisma:2579](<../../../prisma/schema.prisma#L2579>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| unitId | String? | — |
| email | String | — |
| role | WorkspaceRole | — |
| tokenHash | String | @unique |
| invitedBy | String | — |
| expiresAt | DateTime | — |
| acceptedAt | DateTime? | — |
| status | String | @default("PENDING") // "PENDING", "ACCEPTED", "EXPIRED", "REVOKED" |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| unit | GymUnit? | @relation(fields: [unitId], references: [id], onDelete: SetNull) |
| Restrição de modelo | — | @@index([workspaceId, email]) |
| Restrição de modelo | — | @@index([workspaceId, status]) |

## model GymStaffProfile

[prisma/schema.prisma:2600](<../../../prisma/schema.prisma#L2600>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| memberId | String | @unique |
| cref | String? | — |
| jobTitle | String? | — |
| bio | String? | — |
| hireDate | DateTime? | — |
| terminationDate | DateTime? | — |
| emergencyContactName | String? | — |
| emergencyContactPhone | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| member | WorkspaceMember | @relation(fields: [memberId], references: [id], onDelete: Cascade) |

## model GymStudentProfile

[prisma/schema.prisma:2616](<../../../prisma/schema.prisma#L2616>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| memberId | String | @unique |
| registrationNumber | String? | — |
| emergencyContactName | String? | — |
| emergencyContactPhone | String? | — |
| medicalClearance | Boolean | @default(false) |
| medicalClearanceExpiresAt | DateTime? | — |
| notes | String? | @db.Text |
| enrolledAt | DateTime | @default(now()) |
| status | String | @default("ACTIVE") // "ACTIVE", "INACTIVE", "SUSPENDED", "CANCELLED" |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| member | WorkspaceMember | @relation(fields: [memberId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([registrationNumber]) |
| Restrição de modelo | — | @@index([status]) |

## model GymGuardian

[prisma/schema.prisma:2636](<../../../prisma/schema.prisma#L2636>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| studentMemberId | String | — |
| guardianUserId | String? | — |
| name | String | — |
| cpf | String | — |
| email | String? | — |
| phone | String | — |
| relationship | String | // "PAI", "MAE", "TUTOR_LEGAL", "OUTRO" |
| isLegalRepresentative | Boolean | @default(true) |
| isFinancialResponsible | Boolean | @default(true) |
| isEmergencyContact | Boolean | @default(true) |
| hasHealthAccess | Boolean | @default(false) |
| verifiedAt | DateTime? | — |
| verificationNotes | String? | — |
| revokedAt | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| studentMember | WorkspaceMember | @relation("StudentGuardians", fields: [studentMemberId], references: [id], onDelete: Cascade) |
| guardianUser | User? | @relation("UserAsGuardian", fields: [guardianUserId], references: [id], onDelete: SetNull) |
| payerEnrollments | GymEnrollment[] | @relation("GuardianPayerEnrollments") |
| Restrição de modelo | — | @@index([workspaceId, studentMemberId]) |
| Restrição de modelo | — | @@index([cpf]) |
| Restrição de modelo | — | @@index([guardianUserId]) |

## enum WorkspaceSubscriptionStatus

[prisma/schema.prisma:2666](<../../../prisma/schema.prisma#L2666>)

Valores: TRIAL, ACTIVE, PAST_DUE, CANCELED, EXPIRED, INCOMPLETE

## model WorkspaceSubscription

[prisma/schema.prisma:2675](<../../../prisma/schema.prisma#L2675>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | @unique |
| planId | String? | — |
| status | WorkspaceSubscriptionStatus | @default(TRIAL) |
| startDate | DateTime | @default(now()) |
| endDate | DateTime? | — |
| trialEndsAt | DateTime? | — |
| maxStudents | Int | @default(100) |
| maxStaff | Int | @default(10) |
| maxUnits | Int | @default(1) |
| maxDevices | Int | @default(2) |
| storageLimitMb | Int | @default(5120) |
| externalSubscriptionId | String? | @unique |
| externalCustomerId | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| plan | Plan? | @relation(fields: [planId], references: [id]) |

## enum GymBillingCycle

[prisma/schema.prisma:2697](<../../../prisma/schema.prisma#L2697>)

Valores: MONTHLY, BIMONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL, CUSTOM

## enum GymEnrollmentStatus

[prisma/schema.prisma:2706](<../../../prisma/schema.prisma#L2706>)

Valores: DRAFT, PENDING_ACCEPTANCE, PENDING_ACTIVATION, ACTIVE, PAUSED, CANCELLED, EXPIRED

## model GymPlan

[prisma/schema.prisma:2716](<../../../prisma/schema.prisma#L2716>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| name | String | — |
| description | String? | @db.Text |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| versions | GymPlanVersion[] | — |
| Restrição de modelo | — | @@index([workspaceId, isActive]) |

## model GymPlanVersion

[prisma/schema.prisma:2731](<../../../prisma/schema.prisma#L2731>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| planId | String | — |
| version | Int | @default(1) |
| name | String | — |
| description | String? | @db.Text |
| priceInCents | BigInt | — |
| enrollmentFeeInCents | BigInt | @default(0) |
| billingCycle | GymBillingCycle | @default(MONTHLY) |
| durationDays | Int | @default(30) |
| classCreditsPerCycle | Int? | — |
| allowedTimeStart | String? | — |
| allowedTimeEnd | String? | — |
| allowedDaysOfWeek | String? | — |
| allowsAllUnits | Boolean | @default(true) |
| termsText | String | @db.Text |
| termsVersion | String | @default("1.0") |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| plan | GymPlan | @relation(fields: [planId], references: [id], onDelete: Cascade) |
| enrollments | GymEnrollment[] | — |
| scheduledEnrollments | GymEnrollment[] | @relation("ScheduledEnrollmentPlanVersion") |
| invoiceItems | GymInvoiceItem[] | @relation("PlanVersionInvoiceItems") |
| Restrição de modelo | — | @@unique([planId, version]) |
| Restrição de modelo | — | @@index([planId, isActive]) |

## model GymEnrollment

[prisma/schema.prisma:2760](<../../../prisma/schema.prisma#L2760>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| studentMemberId | String | — |
| planVersionId | String | — |
| scheduledPlanVersionId | String? | — |
| unitId | String? | — |
| status | GymEnrollmentStatus | @default(PENDING_ACCEPTANCE) |
| startDate | DateTime | @default(now()) |
| endDate | DateTime? | — |
| autoRenew | Boolean | @default(true) |
| priceInCents | BigInt | — |
| enrollmentFeeInCents | BigInt | @default(0) |
| creditBalanceInCents | BigInt | @default(0) |
| billingPayerUserId | String? | — |
| billingPayerGuardianId | String? | — |
| billingPayerName | String? | — |
| billingPayerCpf | String? | — |
| billingPayerEmail | String? | — |
| billingPayerPhone | String? | — |
| recurrenceMode | GymRecurrenceMode | @default(LOCAL) |
| providerSubscriptionId | String? | — |
| subscriptionStatus | GymSubscriptionStatus | @default(INACTIVE) |
| billingType | GymBillingType | @default(UNDEFINED) |
| checkoutUrl | String? | — |
| creditCardToken | String? | — |
| creditCardBrand | String? | — |
| creditCardLast4 | String? | — |
| nextDueDate | DateTime? | — |
| nextCycleBillingDate | DateTime? | — |
| cycleCount | Int | @default(0) |
| lastPaymentStatus | String? | — |
| accessGranted | Boolean | @default(false) |
| activatedAt | DateTime? | — |
| cancelledAt | DateTime? | — |
| cancellationReason | String? | — |
| cancellationEffectiveDate | DateTime? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation(fields: [workspaceId], references: [id], onDelete: Cascade) |
| studentMember | WorkspaceMember | @relation(fields: [studentMemberId], references: [id], onDelete: Cascade) |
| planVersion | GymPlanVersion | @relation(fields: [planVersionId], references: [id]) |
| scheduledPlanVersion | GymPlanVersion? | @relation("ScheduledEnrollmentPlanVersion", fields: [scheduledPlanVersionId], references: [id], onDelete: SetNull) |
| unit | GymUnit? | @relation(fields: [unitId], references: [id], onDelete: SetNull) |
| billingPayerUser | User? | @relation("BillingPayerUser", fields: [billingPayerUserId], references: [id], onDelete: SetNull) |
| billingPayerGuardian | GymGuardian? | @relation("GuardianPayerEnrollments", fields: [billingPayerGuardianId], references: [id], onDelete: SetNull) |
| acceptance | GymContractAcceptance? | — |
| events | GymEnrollmentEvent[] | — |
| pauses | GymEnrollmentPause[] | — |
| billings | StudentBilling[] | @relation("EnrollmentBillings") |
| invoices | GymInvoice[] | @relation("EnrollmentInvoices") |
| classBookings | GymClassBooking[] | @relation("EnrollmentClassBookings") |
| classWaitlists | GymClassWaitlist[] | @relation("EnrollmentClassWaitlists") |
| accessGrants | GymAccessGrant[] | @relation("EnrollmentGymAccessGrants") |
| Restrição de modelo | — | @@index([workspaceId, status]) |
| Restrição de modelo | — | @@index([workspaceId, studentMemberId]) |
| Restrição de modelo | — | @@index([planVersionId]) |
| Restrição de modelo | — | @@index([unitId]) |
| Restrição de modelo | — | @@index([providerSubscriptionId]) |

## model GymContractAcceptance

[prisma/schema.prisma:2830](<../../../prisma/schema.prisma#L2830>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| enrollmentId | String | @unique |
| workspaceId | String | — |
| signerUserId | String | — |
| representedUserId | String? | — |
| representationRole | String? | // "SELF", "PAI", "MAE", "TUTOR_LEGAL", "OUTRO" |
| termsSnapshot | String | @db.Text |
| termsVersion | String | — |
| ipAddress | String? | — |
| userAgent | String? | — |
| signedAt | DateTime | @default(now()) |
| enrollment | GymEnrollment | @relation(fields: [enrollmentId], references: [id], onDelete: Cascade) |
| signerUser | User | @relation("SignerUser", fields: [signerUserId], references: [id]) |
| representedUser | User? | @relation("RepresentedStudentUser", fields: [representedUserId], references: [id], onDelete: SetNull) |
| Restrição de modelo | — | @@index([workspaceId, signedAt]) |
| Restrição de modelo | — | @@index([signerUserId]) |

## model GymEnrollmentEvent

[prisma/schema.prisma:2851](<../../../prisma/schema.prisma#L2851>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| enrollmentId | String | — |
| workspaceId | String | — |
| fromStatus | GymEnrollmentStatus? | — |
| toStatus | GymEnrollmentStatus | — |
| reason | String? | — |
| actorId | String? | — |
| effectiveDate | DateTime | @default(now()) |
| createdAt | DateTime | @default(now()) |
| enrollment | GymEnrollment | @relation(fields: [enrollmentId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([enrollmentId]) |
| Restrição de modelo | — | @@index([workspaceId, createdAt]) |

## model GymEnrollmentPause

[prisma/schema.prisma:2868](<../../../prisma/schema.prisma#L2868>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| enrollmentId | String | — |
| startDate | DateTime | — |
| endDate | DateTime | — |
| reason | String? | — |
| requestedByUserId | String? | — |
| resumedAt | DateTime? | — |
| extendEndDate | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| enrollment | GymEnrollment | @relation(fields: [enrollmentId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([enrollmentId]) |

## enum GymInvoiceStatus

[prisma/schema.prisma:2889](<../../../prisma/schema.prisma#L2889>)

Valores: DRAFT, OPEN, PARTIALLY_PAID, PAID, CANCELLED, REFUNDED

## enum GymInvoiceItemType

[prisma/schema.prisma:2898](<../../../prisma/schema.prisma#L2898>)

Valores: PLAN_SUBSCRIPTION, ENROLLMENT_FEE, DAILY_PASS, PRODUCT, SERVICE, PENALTY, OTHER

## enum GymInPersonPaymentMethod

[prisma/schema.prisma:2908](<../../../prisma/schema.prisma#L2908>)

Valores: CASH, EXTERNAL_POS_DEBIT, EXTERNAL_POS_CREDIT, BANK_TRANSFER_MANUAL, GATEWAY_ONLINE

## enum GymPaymentStatus

[prisma/schema.prisma:2916](<../../../prisma/schema.prisma#L2916>)

Valores: CONFIRMED, REVERSED

## enum GymAllocationStatus

[prisma/schema.prisma:2921](<../../../prisma/schema.prisma#L2921>)

Valores: ACTIVE, REVERSED

## enum GymRecurrenceMode

[prisma/schema.prisma:2927](<../../../prisma/schema.prisma#L2927>)

Valores: LOCAL, PROVIDER

## enum GymSubscriptionStatus

[prisma/schema.prisma:2932](<../../../prisma/schema.prisma#L2932>)

Valores: INACTIVE, ACTIVE, OVERDUE, CANCELLED, EXPIRED

## enum GymBillingType

[prisma/schema.prisma:2940](<../../../prisma/schema.prisma#L2940>)

Valores: UNDEFINED, CREDIT_CARD, PIX, BOLETO

## model GymInvoice

[prisma/schema.prisma:2947](<../../../prisma/schema.prisma#L2947>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| studentMemberId | String | — |
| studentUserId | String | — |
| enrollmentId | String? | — |
| billingId | String? | — |
| invoiceNumber | String | @unique |
| title | String | — |
| description | String? | @db.Text |
| status | GymInvoiceStatus | @default(OPEN) |
| dueDate | DateTime | — |
| issueDate | DateTime | @default(now()) |
| competenceMonth | String? | — |
| subtotalInCents | BigInt | — |
| discountInCents | BigInt | @default(0) |
| totalInCents | BigInt | — |
| paidAmountInCents | BigInt | @default(0) |
| balanceRemainingInCents | BigInt | — |
| discountPercentage | Float? | — |
| discountReason | String? | — |
| discountAuthorizedByUserId | String? | — |
| payerType | String | @default("STUDENT") // STUDENT, GUARDIAN, CUSTOM |
| payerName | String | — |
| payerCpfCnpj | String? | — |
| payerEmail | String? | — |
| payerPhone | String? | — |
| providerSubscriptionId | String? | — |
| cycleNumber | Int? | — |
| hostedCheckoutUrl | String? | — |
| pixQrCodePayload | String? | @db.Text |
| pixQrCodeUrl | String? | — |
| bankSlipUrl | String? | — |
| createdByUserId | String | — |
| paidAt | DateTime? | — |
| cancelledAt | DateTime? | — |
| cancellationReason | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation("WorkspaceGymInvoices", fields: [workspaceId], references: [id], onDelete: Cascade) |
| studentMember | WorkspaceMember | @relation("StudentMemberInvoices", fields: [studentMemberId], references: [id], onDelete: Cascade) |
| studentUser | User | @relation("StudentUserGymInvoices", fields: [studentUserId], references: [id], onDelete: Restrict) |
| enrollment | GymEnrollment? | @relation("EnrollmentInvoices", fields: [enrollmentId], references: [id], onDelete: SetNull) |
| billing | StudentBilling? | @relation("BillingGymInvoice", fields: [billingId], references: [id], onDelete: SetNull) |
| items | GymInvoiceItem[] | — |
| allocations | GymPaymentAllocation[] | — |
| Restrição de modelo | — | @@index([workspaceId, status]) |
| Restrição de modelo | — | @@index([workspaceId, studentMemberId]) |
| Restrição de modelo | — | @@index([workspaceId, dueDate]) |
| Restrição de modelo | — | @@index([enrollmentId]) |
| Restrição de modelo | — | @@index([providerSubscriptionId]) |
| Restrição de modelo | — | @@index([enrollmentId, competenceMonth]) |

## model GymInvoiceItem

[prisma/schema.prisma:3010](<../../../prisma/schema.prisma#L3010>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| invoiceId | String | — |
| itemType | GymInvoiceItemType | @default(PLAN_SUBSCRIPTION) |
| description | String | — |
| quantity | Int | @default(1) |
| unitPriceInCents | BigInt | — |
| totalInCents | BigInt | — |
| planVersionId | String? | — |
| invoice | GymInvoice | @relation(fields: [invoiceId], references: [id], onDelete: Cascade) |
| planVersion | GymPlanVersion? | @relation("PlanVersionInvoiceItems", fields: [planVersionId], references: [id], onDelete: SetNull) |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@index([invoiceId]) |
| Restrição de modelo | — | @@index([planVersionId]) |

## model GymPayment

[prisma/schema.prisma:3029](<../../../prisma/schema.prisma#L3029>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| paymentNumber | String | @unique |
| receiptNumber | String | @unique |
| idempotencyKey | String | @unique |
| amountInCents | BigInt | — |
| paymentMethod | GymInPersonPaymentMethod | — |
| status | GymPaymentStatus | @default(CONFIRMED) |
| paidAt | DateTime | @default(now()) |
| receivedByUserId | String | — |
| posCardBrand | String? | — |
| posAuthorizationCode | String? | — |
| posNsu | String? | — |
| posTerminalId | String? | — |
| bankTransferProofUrl | String? | — |
| bankTransferTransactionId | String? | — |
| payerName | String | — |
| payerCpfCnpj | String? | — |
| reversedAt | DateTime? | — |
| reversedByUserId | String? | — |
| reversalReason | String? | — |
| taxDisclaimer | String | @default("Este documento é um recibo comprobatório de pagamento e não substitui o documento fiscal (NFS-e/NFC-e).") |
| notes | String? | @db.Text |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation("WorkspaceGymPayments", fields: [workspaceId], references: [id], onDelete: Cascade) |
| receivedByUser | User | @relation("StaffReceivedGymPayments", fields: [receivedByUserId], references: [id], onDelete: Restrict) |
| reversedByUser | User? | @relation("StaffReversedGymPayments", fields: [reversedByUserId], references: [id], onDelete: SetNull) |
| cashDrawerSessionId | String? | — |
| cashDrawerSession | GymCashDrawerSession? | @relation(fields: [cashDrawerSessionId], references: [id], onDelete: SetNull) |
| allocations | GymPaymentAllocation[] | — |
| Restrição de modelo | — | @@index([workspaceId, status]) |
| Restrição de modelo | — | @@index([workspaceId, paidAt]) |
| Restrição de modelo | — | @@index([receivedByUserId]) |
| Restrição de modelo | — | @@index([cashDrawerSessionId]) |

## model GymPaymentAllocation

[prisma/schema.prisma:3079](<../../../prisma/schema.prisma#L3079>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| paymentId | String | — |
| invoiceId | String | — |
| allocatedAmountInCents | BigInt | — |
| status | GymAllocationStatus | @default(ACTIVE) |
| createdAt | DateTime | @default(now()) |
| payment | GymPayment | @relation(fields: [paymentId], references: [id], onDelete: Cascade) |
| invoice | GymInvoice | @relation(fields: [invoiceId], references: [id], onDelete: Cascade) |
| Restrição de modelo | — | @@index([paymentId]) |
| Restrição de modelo | — | @@index([invoiceId]) |
| Restrição de modelo | — | @@index([status]) |

## enum GymFinancialAccountType

[prisma/schema.prisma:3095](<../../../prisma/schema.prisma#L3095>)

Valores: CASH, BANK_ACCOUNT, GATEWAY_ONLINE, SAFE_RESERVE, OTHER

## enum GymExpenseStatus

[prisma/schema.prisma:3103](<../../../prisma/schema.prisma#L3103>)

Valores: PENDING, SCHEDULED, PAID, CANCELLED, OVERDUE

## enum GymCashDrawerStatus

[prisma/schema.prisma:3111](<../../../prisma/schema.prisma#L3111>)

Valores: OPEN, CLOSED, RECONCILED

## enum GymCashMovementType

[prisma/schema.prisma:3117](<../../../prisma/schema.prisma#L3117>)

Valores: OPENING, CASH_INFLOW_PAYMENT, SUPPLY, BLEED, EXPENSE_PAYMENT, CLOSING

## model GymFinancialAccount

[prisma/schema.prisma:3126](<../../../prisma/schema.prisma#L3126>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| unitId | String? | — |
| name | String | — |
| accountType | GymFinancialAccountType | @default(CASH) |
| balanceInCents | BigInt | @default(0) |
| initialBalanceInCents | BigInt | @default(0) |
| currency | String | @default("BRL") |
| bankName | String? | — |
| agencyNumber | String? | — |
| accountNumber | String? | — |
| isDefault | Boolean | @default(false) |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation("WorkspaceFinancialAccounts", fields: [workspaceId], references: [id], onDelete: Cascade) |
| unit | GymUnit? | @relation(fields: [unitId], references: [id], onDelete: SetNull) |
| drawerSessions | GymCashDrawerSession[] | — |
| expenses | GymExpense[] | — |
| outgoingTransfers | GymAccountTransfer[] | @relation("FromAccountTransfers") |
| incomingTransfers | GymAccountTransfer[] | @relation("ToAccountTransfers") |
| Restrição de modelo | — | @@index([workspaceId, isActive]) |
| Restrição de modelo | — | @@index([workspaceId, accountType]) |

## model GymAccountTransfer

[prisma/schema.prisma:3154](<../../../prisma/schema.prisma#L3154>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| fromAccountId | String | — |
| toAccountId | String | — |
| amountInCents | BigInt | — |
| transferredAt | DateTime | @default(now()) |
| description | String? | — |
| referenceId | String? | — |
| performedByUserId | String | — |
| createdAt | DateTime | @default(now()) |
| workspace | Workspace | @relation("WorkspaceAccountTransfers", fields: [workspaceId], references: [id], onDelete: Cascade) |
| fromAccount | GymFinancialAccount | @relation("FromAccountTransfers", fields: [fromAccountId], references: [id], onDelete: Restrict) |
| toAccount | GymFinancialAccount | @relation("ToAccountTransfers", fields: [toAccountId], references: [id], onDelete: Restrict) |
| performedByUser | User | @relation("TransfersPerformed", fields: [performedByUserId], references: [id], onDelete: Restrict) |
| Restrição de modelo | — | @@index([workspaceId, transferredAt]) |
| Restrição de modelo | — | @@index([fromAccountId]) |
| Restrição de modelo | — | @@index([toAccountId]) |

## model GymExpenseCategory

[prisma/schema.prisma:3176](<../../../prisma/schema.prisma#L3176>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| name | String | — |
| code | String? | — |
| color | String? | — |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation("WorkspaceExpenseCategories", fields: [workspaceId], references: [id], onDelete: Cascade) |
| expenses | GymExpense[] | — |
| Restrição de modelo | — | @@unique([workspaceId, name]) |
| Restrição de modelo | — | @@index([workspaceId, isActive]) |

## model GymSupplier

[prisma/schema.prisma:3193](<../../../prisma/schema.prisma#L3193>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| tradeName | String | — |
| corporateName | String? | — |
| cnpjCpf | String? | — |
| email | String? | — |
| phone | String? | — |
| contactName | String? | — |
| notes | String? | @db.Text |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation("WorkspaceSuppliers", fields: [workspaceId], references: [id], onDelete: Cascade) |
| expenses | GymExpense[] | — |
| Restrição de modelo | — | @@index([workspaceId, tradeName]) |
| Restrição de modelo | — | @@index([workspaceId, cnpjCpf]) |

## model GymExpense

[prisma/schema.prisma:3214](<../../../prisma/schema.prisma#L3214>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| unitId | String? | — |
| supplierId | String? | — |
| supplierName | String? | — |
| categoryId | String | — |
| title | String | — |
| description | String? | @db.Text |
| documentNumber | String? | — |
| amountInCents | BigInt | — |
| penaltyInCents | BigInt | @default(0) |
| discountInCents | BigInt | @default(0) |
| paidAmountInCents | BigInt | @default(0) |
| dueDate | DateTime | — |
| competenceMonth | String | // "YYYY-MM" |
| paidAt | DateTime? | — |
| status | GymExpenseStatus | @default(PENDING) |
| financialAccountId | String? | — |
| paymentMethod | String? | — |
| paymentProofUrl | String? | — |
| createdByUserId | String | — |
| paidByUserId | String? | — |
| cancellationReason | String? | — |
| cancelledAt | DateTime? | — |
| cancelledByUserId | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation("WorkspaceExpenses", fields: [workspaceId], references: [id], onDelete: Cascade) |
| unit | GymUnit? | @relation(fields: [unitId], references: [id], onDelete: SetNull) |
| supplier | GymSupplier? | @relation(fields: [supplierId], references: [id], onDelete: SetNull) |
| category | GymExpenseCategory | @relation(fields: [categoryId], references: [id], onDelete: Restrict) |
| financialAccount | GymFinancialAccount? | @relation(fields: [financialAccountId], references: [id], onDelete: SetNull) |
| createdByUser | User | @relation("CreatedExpenses", fields: [createdByUserId], references: [id], onDelete: Restrict) |
| paidByUser | User? | @relation("PaidExpenses", fields: [paidByUserId], references: [id], onDelete: SetNull) |
| cancelledByUser | User? | @relation("CancelledExpenses", fields: [cancelledByUserId], references: [id], onDelete: SetNull) |
| Restrição de modelo | — | @@index([workspaceId, status]) |
| Restrição de modelo | — | @@index([workspaceId, dueDate]) |
| Restrição de modelo | — | @@index([workspaceId, competenceMonth]) |
| Restrição de modelo | — | @@index([categoryId]) |
| Restrição de modelo | — | @@index([supplierId]) |
| Restrição de modelo | — | @@index([financialAccountId]) |

## model GymCashDrawerSession

[prisma/schema.prisma:3260](<../../../prisma/schema.prisma#L3260>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| unitId | String? | — |
| financialAccountId | String | — |
| sessionNumber | String | @unique // CX-YYYYMM-XXXXXX |
| status | GymCashDrawerStatus | @default(OPEN) |
| openedAt | DateTime | @default(now()) |
| openedByUserId | String | — |
| openingAmountInCents | BigInt | — |
| closedAt | DateTime? | — |
| closedByUserId | String? | — |
| expectedCashInCents | BigInt | @default(0) |
| actualCashInCents | BigInt? | — |
| differenceInCents | BigInt? | — |
| differenceReason | String? | @db.Text |
| notes | String? | @db.Text |
| reconciledAt | DateTime? | — |
| reconciledByUserId | String? | — |
| reconciliationNotes | String? | @db.Text |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| workspace | Workspace | @relation("WorkspaceCashDrawerSessions", fields: [workspaceId], references: [id], onDelete: Cascade) |
| unit | GymUnit? | @relation(fields: [unitId], references: [id], onDelete: SetNull) |
| financialAccount | GymFinancialAccount | @relation(fields: [financialAccountId], references: [id], onDelete: Restrict) |
| openedByUser | User | @relation("CashDrawersOpened", fields: [openedByUserId], references: [id], onDelete: Restrict) |
| closedByUser | User? | @relation("CashDrawersClosed", fields: [closedByUserId], references: [id], onDelete: SetNull) |
| reconciledByUser | User? | @relation("CashDrawersReconciled", fields: [reconciledByUserId], references: [id], onDelete: SetNull) |
| movements | GymCashDrawerMovement[] | — |
| payments | GymPayment[] | — |
| Restrição de modelo | — | @@index([workspaceId, status]) |
| Restrição de modelo | — | @@index([financialAccountId]) |
| Restrição de modelo | — | @@index([openedByUserId]) |
| Restrição de modelo | — | @@index([openedAt]) |

## model GymCashDrawerMovement

[prisma/schema.prisma:3298](<../../../prisma/schema.prisma#L3298>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| sessionId | String | — |
| movementType | GymCashMovementType | — |
| amountInCents | BigInt | — |
| description | String? | — |
| performedByUserId | String | — |
| paymentId | String? | — |
| expenseId | String? | — |
| createdAt | DateTime | @default(now()) |
| session | GymCashDrawerSession | @relation(fields: [sessionId], references: [id], onDelete: Cascade) |
| performedByUser | User | @relation("CashMovementsPerformed", fields: [performedByUserId], references: [id], onDelete: Restrict) |
| Restrição de modelo | — | @@index([sessionId]) |
| Restrição de modelo | — | @@index([movementType]) |

## enum GymDivergenceType

[prisma/schema.prisma:3316](<../../../prisma/schema.prisma#L3316>)

Valores: UNLINKED_GATEWAY_PAYMENT, PAID_GATEWAY_UNPAID_INVOICE, AMOUNT_MISMATCH, STATUS_MISMATCH, CHARGEBACK_DISPUTE, ORPHAN_INVOICE

## enum GymDivergenceStatus

[prisma/schema.prisma:3325](<../../../prisma/schema.prisma#L3325>)

Valores: PENDING, RESOLVED, IGNORED

## model GymReconciliationDivergence

[prisma/schema.prisma:3331](<../../../prisma/schema.prisma#L3331>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceReconciliationDivergences", fields: [workspaceId], references: [id], onDelete: Cascade) |
| divergenceType | GymDivergenceType | — |
| resourceType | String | — |
| resourceId | String | — |
| referenceNumber | String? | — |
| studentName | String? | — |
| expectedAmountInCents | BigInt | @default(0) |
| actualAmountInCents | BigInt | @default(0) |
| differenceInCents | BigInt | @default(0) |
| description | String | @db.Text |
| status | GymDivergenceStatus | @default(PENDING) |
| resolvedAt | DateTime? | — |
| resolvedByUserId | String? | — |
| resolutionNotes | String? | @db.Text |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([workspaceId, status]) |
| Restrição de modelo | — | @@index([resourceType, resourceId]) |

## enum GymClassSessionStatus

[prisma/schema.prisma:3363](<../../../prisma/schema.prisma#L3363>)

Valores: SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED

## model GymModality

[prisma/schema.prisma:3371](<../../../prisma/schema.prisma#L3371>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymModalities", fields: [workspaceId], references: [id], onDelete: Cascade) |
| name | String | — |
| description | String? | @db.Text |
| color | String | @default("#3b82f6") // hex code para diferenciação na grade |
| icon | String? | — |
| defaultDurationMinutes | Int | @default(50) |
| defaultCapacity | Int | @default(20) |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| schedules | GymClassSchedule[] | — |
| sessions | GymClassSession[] | — |
| Restrição de modelo | — | @@unique([workspaceId, name]) |
| Restrição de modelo | — | @@index([workspaceId, isActive]) |

## model GymRoom

[prisma/schema.prisma:3392](<../../../prisma/schema.prisma#L3392>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymRooms", fields: [workspaceId], references: [id], onDelete: Cascade) |
| unitId | String | — |
| unit | GymUnit | @relation("UnitGymRooms", fields: [unitId], references: [id], onDelete: Cascade) |
| name | String | — |
| description | String? | @db.Text |
| maxCapacity | Int | @default(30) |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| schedules | GymClassSchedule[] | — |
| sessions | GymClassSession[] | — |
| Restrição de modelo | — | @@unique([workspaceId, unitId, name]) |
| Restrição de modelo | — | @@index([workspaceId, unitId, isActive]) |

## model GymClassSchedule

[prisma/schema.prisma:3412](<../../../prisma/schema.prisma#L3412>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymClassSchedules", fields: [workspaceId], references: [id], onDelete: Cascade) |
| unitId | String | — |
| unit | GymUnit | @relation("UnitGymClassSchedules", fields: [unitId], references: [id], onDelete: Cascade) |
| modalityId | String | — |
| modality | GymModality | @relation(fields: [modalityId], references: [id], onDelete: Restrict) |
| roomId | String | — |
| room | GymRoom | @relation(fields: [roomId], references: [id], onDelete: Restrict) |
| instructorStaffId | String | — |
| instructor | WorkspaceMember | @relation("InstructorClassSchedules", fields: [instructorStaffId], references: [id], onDelete: Restrict) |
| dayOfWeek | Int | // 0 (Domingo) a 6 (Sábado) |
| startTime | String | // Formato "HH:mm" (ex: "08:00") |
| endTime | String | // Formato "HH:mm" (ex: "08:50") |
| capacity | Int | // Quantidade máxima de vagas ofertadas (<= room.maxCapacity) |
| allowWaitlist | Boolean | @default(true) |
| maxWaitlist | Int | @default(5) |
| startDate | DateTime | @default(now()) |
| endDate | DateTime? | — |
| isActive | Boolean | @default(true) |
| notes | String? | @db.Text |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| sessions | GymClassSession[] | — |
| Restrição de modelo | — | @@index([workspaceId, dayOfWeek, isActive]) |
| Restrição de modelo | — | @@index([workspaceId, roomId, dayOfWeek]) |
| Restrição de modelo | — | @@index([workspaceId, instructorStaffId, dayOfWeek]) |

## model GymClassSession

[prisma/schema.prisma:3446](<../../../prisma/schema.prisma#L3446>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymClassSessions", fields: [workspaceId], references: [id], onDelete: Cascade) |
| unitId | String | — |
| unit | GymUnit | @relation("UnitGymClassSessions", fields: [unitId], references: [id], onDelete: Cascade) |
| scheduleId | String? | — |
| schedule | GymClassSchedule? | @relation(fields: [scheduleId], references: [id], onDelete: SetNull) |
| modalityId | String | — |
| modality | GymModality | @relation(fields: [modalityId], references: [id], onDelete: Restrict) |
| roomId | String | — |
| room | GymRoom | @relation(fields: [roomId], references: [id], onDelete: Restrict) |
| instructorStaffId | String | — |
| instructor | WorkspaceMember | @relation("InstructorClassSessions", fields: [instructorStaffId], references: [id], onDelete: Restrict) |
| substituteInstructorStaffId | String? | — |
| substituteInstructor | WorkspaceMember? | @relation("SubstituteInstructorClassSessions", fields: [substituteInstructorStaffId], references: [id], onDelete: SetNull) |
| substituteReason | String? | @db.Text |
| isSubstitute | Boolean | @default(false) |
| sessionDate | DateTime | // YYYY-MM-DDT00:00:00.000Z |
| startsAt | DateTime | // Horário real início com fuso |
| endsAt | DateTime | // Horário real término com fuso |
| capacity | Int | // Vagas desta sessão específica |
| allowWaitlist | Boolean | @default(true) |
| maxWaitlist | Int | @default(5) |
| status | GymClassSessionStatus | @default(SCHEDULED) |
| bookedCount | Int | @default(0) |
| waitlistCount | Int | @default(0) |
| cancelledAt | DateTime? | — |
| cancellationReason | String? | @db.Text |
| cancellationActorUserId | String? | — |
| notes | String? | @db.Text |
| bookings | GymClassBooking[] | @relation("SessionClassBookings") |
| waitlists | GymClassWaitlist[] | @relation("SessionClassWaitlists") |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@unique([scheduleId, sessionDate]) |
| Restrição de modelo | — | @@index([workspaceId, sessionDate, status]) |
| Restrição de modelo | — | @@index([workspaceId, roomId, startsAt, endsAt]) |
| Restrição de modelo | — | @@index([workspaceId, instructorStaffId, startsAt, endsAt]) |

## enum GymClassBookingStatus

[prisma/schema.prisma:3493](<../../../prisma/schema.prisma#L3493>)

Valores: CONFIRMED, CANCELLED, LATE_CANCELLED, NO_SHOW, ATTENDED

## enum GymClassWaitlistStatus

[prisma/schema.prisma:3501](<../../../prisma/schema.prisma#L3501>)

Valores: WAITING, OFFERED, PROMOTED, EXPIRED, CANCELLED

## model GymClassBooking

[prisma/schema.prisma:3509](<../../../prisma/schema.prisma#L3509>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymClassBookings", fields: [workspaceId], references: [id], onDelete: Cascade) |
| sessionId | String | — |
| session | GymClassSession | @relation("SessionClassBookings", fields: [sessionId], references: [id], onDelete: Cascade) |
| studentMemberId | String | — |
| studentMember | WorkspaceMember | @relation("StudentClassBookings", fields: [studentMemberId], references: [id], onDelete: Cascade) |
| enrollmentId | String? | — |
| enrollment | GymEnrollment? | @relation("EnrollmentClassBookings", fields: [enrollmentId], references: [id], onDelete: SetNull) |
| bookedByUserId | String | — |
| status | GymClassBookingStatus | @default(CONFIRMED) |
| bookedAt | DateTime | @default(now()) |
| cancelledAt | DateTime? | — |
| cancellationReason | String? | @db.Text |
| cancelledByUserId | String? | — |
| checkInAt | DateTime? | — |
| checkInMethod | String? | // MANUAL_STAFF, SELF_CHECKIN, RECEPTION |
| checkInStaffMemberId | String? | — |
| checkedInByUserId | String? | — |
| notes | String? | @db.Text |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([sessionId, status]) |
| Restrição de modelo | — | @@index([studentMemberId, status]) |
| Restrição de modelo | — | @@index([workspaceId, bookedAt]) |

## model GymClassWaitlist

[prisma/schema.prisma:3540](<../../../prisma/schema.prisma#L3540>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymClassWaitlists", fields: [workspaceId], references: [id], onDelete: Cascade) |
| sessionId | String | — |
| session | GymClassSession | @relation("SessionClassWaitlists", fields: [sessionId], references: [id], onDelete: Cascade) |
| studentMemberId | String | — |
| studentMember | WorkspaceMember | @relation("StudentClassWaitlists", fields: [studentMemberId], references: [id], onDelete: Cascade) |
| enrollmentId | String? | — |
| enrollment | GymEnrollment? | @relation("EnrollmentClassWaitlists", fields: [enrollmentId], references: [id], onDelete: SetNull) |
| requestedByUserId | String | — |
| position | Int | — |
| status | GymClassWaitlistStatus | @default(WAITING) |
| offeredAt | DateTime? | — |
| offerExpiresAt | DateTime? | — |
| promotedBookingId | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([sessionId, status, position]) |
| Restrição de modelo | — | @@index([studentMemberId, status]) |
| Restrição de modelo | — | @@index([workspaceId, status]) |

## enum GymAccessGrantStatus

[prisma/schema.prisma:3570](<../../../prisma/schema.prisma#L3570>)

Valores: ACTIVE, SUSPENDED, REVOKED, EXPIRED

## enum GymAccessDecision

[prisma/schema.prisma:3577](<../../../prisma/schema.prisma#L3577>)

Valores: GRANTED, DENIED

## model GymAccessGrant

[prisma/schema.prisma:3582](<../../../prisma/schema.prisma#L3582>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymAccessGrants", fields: [workspaceId], references: [id], onDelete: Cascade) |
| studentMemberId | String | — |
| studentMember | WorkspaceMember | @relation("StudentGymAccessGrants", fields: [studentMemberId], references: [id], onDelete: Cascade) |
| enrollmentId | String? | — |
| enrollment | GymEnrollment? | @relation("EnrollmentGymAccessGrants", fields: [enrollmentId], references: [id], onDelete: SetNull) |
| status | GymAccessGrantStatus | @default(ACTIVE) |
| allowsAllUnits | Boolean | @default(true) |
| allowedUnitIds | Json? | // string[] com IDs das filiais permitidas |
| allowedTimeStart | String? | // "HH:mm" (ex: "06:00") |
| allowedTimeEnd | String? | // "HH:mm" (ex: "22:00") |
| allowedDaysOfWeek | String? | // "1,2,3,4,5,6" (0=Dom..6=Sáb) |
| credentialType | String | @default("QR_CODE") // QR_CODE, RFID_CARD, BIOMETRIC, PIN |
| credentialCode | String? | // Código físico ou hash seguro da credencial |
| validFrom | DateTime | @default(now()) |
| validUntil | DateTime? | // Data limite de validade do grant |
| ruleVersion | String | @default("1.0") |
| lastProjectedAt | DateTime | @default(now()) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([workspaceId, status]) |
| Restrição de modelo | — | @@index([studentMemberId, status]) |
| Restrição de modelo | — | @@index([credentialType, credentialCode]) |

## model GymAccessOverride

[prisma/schema.prisma:3612](<../../../prisma/schema.prisma#L3612>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymAccessOverrides", fields: [workspaceId], references: [id], onDelete: Cascade) |
| studentMemberId | String | — |
| studentMember | WorkspaceMember | @relation("StudentGymAccessOverrides", fields: [studentMemberId], references: [id], onDelete: Cascade) |
| unitId | String? | — |
| unit | GymUnit? | @relation("UnitGymAccessOverrides", fields: [unitId], references: [id], onDelete: SetNull) |
| grantedByUserId | String | — |
| reason | String | @db.Text |
| validFrom | DateTime | @default(now()) |
| validUntil | DateTime | — |
| isActive | Boolean | @default(true) |
| revokedAt | DateTime? | — |
| revokedByUserId | String? | — |
| revocationReason | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([workspaceId, studentMemberId, isActive]) |
| Restrição de modelo | — | @@index([validUntil]) |

## model GymAccessDecisionLog

[prisma/schema.prisma:3637](<../../../prisma/schema.prisma#L3637>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymAccessDecisionLogs", fields: [workspaceId], references: [id], onDelete: Cascade) |
| studentMemberId | String | — |
| studentMember | WorkspaceMember | @relation("StudentGymAccessDecisionLogs", fields: [studentMemberId], references: [id], onDelete: Cascade) |
| unitId | String | — |
| unit | GymUnit | @relation("UnitGymAccessDecisionLogs", fields: [unitId], references: [id], onDelete: Cascade) |
| decision | GymAccessDecision | — |
| reasonCode | String | // VALID_ACTIVE_MEMBERSHIP, OVERDUE_PAYMENT_BLOCKED, etc. |
| ruleVersion | String | @default("1.0") |
| factors | Json | // Detalhamento dos fatores avaliados |
| evaluatorType | String | @default("TURNSTILE_ENGINE") // TURNSTILE_ENGINE, RECEPTION_PANEL, SIMULATOR |
| evaluatedByUserId | String? | — |
| evaluatedAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@index([workspaceId, evaluatedAt]) |
| Restrição de modelo | — | @@index([studentMemberId, evaluatedAt]) |
| Restrição de modelo | — | @@index([workspaceId, decision]) |

## enum GymDeviceType

[prisma/schema.prisma:3659](<../../../prisma/schema.prisma#L3659>)

Valores: TURNSTILE, FACIAL_TERMINAL, RFID_READER, BIOMETRIC_READER, DOOR_CONTROLLER

## enum GymDeviceStatus

[prisma/schema.prisma:3667](<../../../prisma/schema.prisma#L3667>)

Valores: ONLINE, OFFLINE, DEGRADED, MAINTENANCE

## enum GymDeviceCommandType

[prisma/schema.prisma:3674](<../../../prisma/schema.prisma#L3674>)

Valores: RELEASE_TURNSTILE, SYNC_USER, DELETE_USER, SYNC_CREDENTIAL, DELETE_CREDENTIAL, SET_CLOCK, REBOOT

## enum GymDeviceCommandStatus

[prisma/schema.prisma:3684](<../../../prisma/schema.prisma#L3684>)

Valores: PENDING, SENT, ACKNOWLEDGED, FAILED, EXPIRED

## enum GymAccessDirection

[prisma/schema.prisma:3692](<../../../prisma/schema.prisma#L3692>)

Valores: ENTRY, EXIT, UNKNOWN

## model GymAccessDevice

[prisma/schema.prisma:3698](<../../../prisma/schema.prisma#L3698>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymAccessDevices", fields: [workspaceId], references: [id], onDelete: Cascade) |
| unitId | String | — |
| unit | GymUnit | @relation("UnitGymAccessDevices", fields: [unitId], references: [id], onDelete: Cascade) |
| name | String | — |
| deviceType | GymDeviceType | @default(TURNSTILE) |
| manufacturer | String | @default("CONTROL_ID") |
| model | String? | — |
| serialNumber | String? | — |
| ipAddress | String? | — |
| port | Int? | @default(80) |
| externalDeviceId | String? | — |
| deviceTokenHash | String? | @unique |
| deviceTokenPrefix | String? | — |
| status | GymDeviceStatus | @default(OFFLINE) |
| firmwareVersion | String? | — |
| lastHeartbeatAt | DateTime? | — |
| lastSyncAt | DateTime? | — |
| config | Json? | — |
| contingencyMode | Boolean | @default(false) |
| contingencyReason | String? | — |
| contingencyStartedAt | DateTime? | — |
| contingencyExpiresAt | DateTime? | — |
| contingencyStartedByUserId | String? | — |
| lastOfflineSyncAt | DateTime? | — |
| cacheVersion | Int | @default(1) |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| commands | GymDeviceCommand[] | @relation("DeviceGymCommands") |
| accessLogs | GymAccessLog[] | @relation("DeviceGymAccessLogs") |
| Restrição de modelo | — | @@index([workspaceId, unitId, status]) |
| Restrição de modelo | — | @@index([deviceTokenHash]) |
| Restrição de modelo | — | @@index([serialNumber]) |

## model GymDeviceCommand

[prisma/schema.prisma:3745](<../../../prisma/schema.prisma#L3745>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymDeviceCommands", fields: [workspaceId], references: [id], onDelete: Cascade) |
| deviceId | String | — |
| device | GymAccessDevice | @relation("DeviceGymCommands", fields: [deviceId], references: [id], onDelete: Cascade) |
| commandType | GymDeviceCommandType | — |
| payload | Json? | — |
| idempotencyKey | String? | — |
| status | GymDeviceCommandStatus | @default(PENDING) |
| priority | Int | @default(0) |
| expiresAt | DateTime? | — |
| sentAt | DateTime? | — |
| acknowledgedAt | DateTime? | — |
| resultPayload | Json? | — |
| errorMessage | String? | — |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([deviceId, status, priority]) |
| Restrição de modelo | — | @@index([workspaceId, commandType]) |
| Restrição de modelo | — | @@index([idempotencyKey]) |

## model GymAccessLog

[prisma/schema.prisma:3773](<../../../prisma/schema.prisma#L3773>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymAccessLogs", fields: [workspaceId], references: [id], onDelete: Cascade) |
| unitId | String | — |
| unit | GymUnit | @relation("UnitGymAccessLogs", fields: [unitId], references: [id], onDelete: Cascade) |
| deviceId | String? | — |
| device | GymAccessDevice? | @relation("DeviceGymAccessLogs", fields: [deviceId], references: [id], onDelete: SetNull) |
| studentMemberId | String? | — |
| studentMember | WorkspaceMember? | @relation("StudentGymAccessLogs", fields: [studentMemberId], references: [id], onDelete: SetNull) |
| externalPersonId | String? | — |
| credentialType | String? | — |
| credentialCode | String? | — |
| granted | Boolean | @default(true) |
| direction | GymAccessDirection | @default(ENTRY) |
| reasonCode | String? | — |
| rawEvent | Json? | — |
| accessedAt | DateTime | @default(now()) |
| offlineSequenceId | Int? | — |
| deduplicationKey | String? | @unique |
| wasOffline | Boolean | @default(false) |
| clockDriftMs | Int | @default(0) |
| syncedAt | DateTime? | — |
| reconciliationDivergence | GymAccessReconciliationDivergence? | — |
| createdAt | DateTime | @default(now()) |
| Restrição de modelo | — | @@index([workspaceId, unitId, accessedAt]) |
| Restrição de modelo | — | @@index([studentMemberId, accessedAt]) |
| Restrição de modelo | — | @@index([deviceId, accessedAt]) |
| Restrição de modelo | — | @@index([externalPersonId]) |
| Restrição de modelo | — | @@index([deduplicationKey]) |
| Restrição de modelo | — | @@index([wasOffline]) |

## enum GymAccessDivergenceSeverity

[prisma/schema.prisma:3814](<../../../prisma/schema.prisma#L3814>)

Valores: LOW, MEDIUM, HIGH, CRITICAL

## enum GymAccessDivergenceStatus

[prisma/schema.prisma:3821](<../../../prisma/schema.prisma#L3821>)

Valores: OPEN, RESOLVED, DISMISSED

## model GymAccessReconciliationDivergence

[prisma/schema.prisma:3827](<../../../prisma/schema.prisma#L3827>)

| Campo | Tipo/cardinalidade | Default, chave, relação ou anotação |
|---|---|---|
| id | String | @id @default(cuid()) |
| workspaceId | String | — |
| workspace | Workspace | @relation("WorkspaceGymAccessReconciliationDivergences", fields: [workspaceId], references: [id], onDelete: Cascade) |
| unitId | String | — |
| unit | GymUnit | @relation("UnitGymAccessReconciliationDivergences", fields: [unitId], references: [id], onDelete: Cascade) |
| deviceId | String? | — |
| accessLogId | String? | @unique |
| accessLog | GymAccessLog? | @relation(fields: [accessLogId], references: [id], onDelete: SetNull) |
| studentMemberId | String? | — |
| studentMember | WorkspaceMember? | @relation("StudentGymAccessReconciliationDivergences", fields: [studentMemberId], references: [id], onDelete: SetNull) |
| divergenceType | String | // OFFLINE_REVOKED_GRANT_USED, INACTIVE_MEMBER_OFFLINE_PASSAGE, CLOCK_DRIFT_EXCESSIVE, UNKNOWN_CREDENTIAL_OFFLINE |
| severity | GymAccessDivergenceSeverity | @default(MEDIUM) |
| status | GymAccessDivergenceStatus | @default(OPEN) |
| description | String | @db.Text |
| snapshotData | Json? | — |
| resolvedAt | DateTime? | — |
| resolvedByUserId | String? | — |
| resolutionNotes | String? | @db.Text |
| detectedAt | DateTime | @default(now()) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| Restrição de modelo | — | @@index([workspaceId, unitId, status]) |
| Restrição de modelo | — | @@index([studentMemberId, status]) |
| Restrição de modelo | — | @@index([detectedAt]) |

## Histórico SQL disponível

| Migration | Tabelas criadas | ALTERs/tabelas referenciadas |
|---|---|---|
| [prisma/migrations/20260514191258_init_atlasfit_schema/migration.sql](<../../../prisma/migrations/20260514191258_init_atlasfit_schema/migration.sql>) | User, Workspace, WorkspaceMember, Plan, Subscription, AuditLog, Account, Session, VerificationToken | WorkspaceMember, User, Workspace, Subscription, Plan, AuditLog, Account, Session |
| [prisma/migrations/20260810041500_add_activation_fee_recovery_operations/migration.sql](<../../../prisma/migrations/20260810041500_add_activation_fee_recovery_operations/migration.sql>) | — | PaymentProviderAccount, ActivationFeeRecoveryOperation, StudentBilling |
| [prisma/migrations/20260925000000_add_gym_workspace_models/migration.sql](<../../../prisma/migrations/20260925000000_add_gym_workspace_models/migration.sql>) | — | Workspace, GymSettings, GymUnit, WorkspaceRoleGrant, WorkspaceMember, WorkspaceInvitation, GymStaffProfile |
| [prisma/migrations/20260925010000_add_workspace_subscription/migration.sql](<../../../prisma/migrations/20260925010000_add_workspace_subscription/migration.sql>) | — | WorkspaceSubscription, Workspace, Plan |
| [prisma/migrations/20260925020000_add_member_unit_and_staff_assignment/migration.sql](<../../../prisma/migrations/20260925020000_add_member_unit_and_staff_assignment/migration.sql>) | — | WorkspaceMember, GymUnit |
| [prisma/migrations/20260925030000_add_gym_student_profile/migration.sql](<../../../prisma/migrations/20260925030000_add_gym_student_profile/migration.sql>) | GymStudentProfile | GymStudentProfile, WorkspaceMember |
| [prisma/migrations/20260925040000_add_gym_minor_guardian/migration.sql](<../../../prisma/migrations/20260925040000_add_gym_minor_guardian/migration.sql>) | GymGuardian | LegalAcceptance, WorkspaceMember, User, GymGuardian, Workspace |
| [prisma/migrations/20260925050000_add_gym_plan_enrollment_contracts/migration.sql](<../../../prisma/migrations/20260925050000_add_gym_plan_enrollment_contracts/migration.sql>) | GymPlan, GymPlanVersion, GymEnrollment, GymContractAcceptance, GymEnrollmentEvent, GymEnrollmentPause | GymPlan, Workspace, GymPlanVersion, GymEnrollment, WorkspaceMember, GymUnit, User, GymGuardian, GymContractAcceptance, GymEnrollmentEvent, GymEnrollmentPause |
| [prisma/migrations/20260925060000_add_gym_enrollment_lifecycle_fields/migration.sql](<../../../prisma/migrations/20260925060000_add_gym_enrollment_lifecycle_fields/migration.sql>) | — | GymEnrollment, GymEnrollmentPause, GymPlanVersion |
| [prisma/migrations/20260925070000_add_financial_profile_user_workspace/migration.sql](<../../../prisma/migrations/20260925070000_add_financial_profile_user_workspace/migration.sql>) | — | PaymentProviderAccount, Workspace, GatewayCustomer, StudentBilling, GymEnrollment |
| [prisma/migrations/20260925080000_add_gym_invoice_payment_allocations/migration.sql](<../../../prisma/migrations/20260925080000_add_gym_invoice_payment_allocations/migration.sql>) | GymInvoice, GymInvoiceItem, GymPayment, GymPaymentAllocation | GymSettings, GymInvoice, Workspace, WorkspaceMember, User, GymEnrollment, StudentBilling, GymInvoiceItem, GymPlanVersion, GymPayment, GymPaymentAllocation |
| [prisma/migrations/20260925090000_add_gym_recurrence_and_checkout/migration.sql](<../../../prisma/migrations/20260925090000_add_gym_recurrence_and_checkout/migration.sql>) | — | GymEnrollment, GymInvoice |
| [prisma/migrations/20260925100000_add_gym_cash_drawer_and_expenses/migration.sql](<../../../prisma/migrations/20260925100000_add_gym_cash_drawer_and_expenses/migration.sql>) | GymFinancialAccount, GymAccountTransfer, GymExpenseCategory, GymSupplier, GymExpense, GymCashDrawerSession, GymCashDrawerMovement | GymPayment, GymCashDrawerSession, GymFinancialAccount, Workspace, GymUnit, GymAccountTransfer, User, GymExpenseCategory, GymSupplier, GymExpense, GymCashDrawerMovement |
| [prisma/migrations/20260925110000_add_gym_wallet_reconciliation_and_exceptions/migration.sql](<../../../prisma/migrations/20260925110000_add_gym_wallet_reconciliation_and_exceptions/migration.sql>) | GymReconciliationDivergence | StudentBilling, GymReconciliationDivergence, Workspace |
| [prisma/migrations/20260925120000_add_gym_classes_modalities_rooms/migration.sql](<../../../prisma/migrations/20260925120000_add_gym_classes_modalities_rooms/migration.sql>) | GymModality, GymRoom, GymClassSchedule, GymClassSession | GymModality, Workspace, GymRoom, GymUnit, GymClassSchedule, WorkspaceMember, GymClassSession |
| [prisma/migrations/20260925130000_add_gym_class_booking_and_waitlist/migration.sql](<../../../prisma/migrations/20260925130000_add_gym_class_booking_and_waitlist/migration.sql>) | GymClassBooking, GymClassWaitlist | GymClassSession, GymClassBooking, Workspace, WorkspaceMember, GymEnrollment, GymClassWaitlist |
| [prisma/migrations/20260925140000_add_gym_booking_attendance_fields/migration.sql](<../../../prisma/migrations/20260925140000_add_gym_booking_attendance_fields/migration.sql>) | — | GymClassBooking |
| [prisma/migrations/20260925150000_add_gym_access_grants_overrides_and_decision_logs/migration.sql](<../../../prisma/migrations/20260925150000_add_gym_access_grants_overrides_and_decision_logs/migration.sql>) | GymAccessGrant, GymAccessOverride, GymAccessDecisionLog | GymAccessGrant, Workspace, WorkspaceMember, GymEnrollment, GymAccessOverride, GymUnit, GymAccessDecisionLog |
| [prisma/migrations/20260925160000_add_gym_access_devices_commands_and_logs/migration.sql](<../../../prisma/migrations/20260925160000_add_gym_access_devices_commands_and_logs/migration.sql>) | GymAccessDevice, GymDeviceCommand, GymAccessLog | GymAccessDevice, Workspace, GymUnit, GymDeviceCommand, GymAccessLog, WorkspaceMember |
| [prisma/migrations/20260925170000_add_gym_access_offline_and_reconciliation/migration.sql](<../../../prisma/migrations/20260925170000_add_gym_access_offline_and_reconciliation/migration.sql>) | GymAccessReconciliationDivergence | GymAccessDevice, GymAccessLog, GymAccessReconciliationDivergence, Workspace, GymUnit, WorkspaceMember |

### Divergência estática

Tabelas referenciadas/alteradas sem CREATE TABLE localizado em qualquer migration do checkout: **PaymentProviderAccount, ActivationFeeRecoveryOperation, StudentBilling, GymSettings, GymUnit, WorkspaceRoleGrant, WorkspaceInvitation, GymStaffProfile, WorkspaceSubscription, LegalAcceptance, GatewayCustomer**. Isso demonstra dependência de baseline externo/ausente; não demonstra qual é o estado do banco implantado. Não foi aplicado SQL.

Modelos do schema sem CREATE TABLE com o mesmo nome: UserTotpDevice, FreeTrial, Transaction, Coupon, PasswordResetToken, MuscleGroup, Exercise, TrainerVideo, TrainerVideoExercise, Workout, WorkoutExercise, SystemSetting, SubscriptionActivity, SystemIntegration, ExerciseAdjustmentRequest, AdjustmentMessage, WorkspacePlan, WorkspacePayment, PendingStudent, TrainerTask, StudentProgress, StudentProgressPhoto, PhysicalEvaluation, StudentFile, WorkoutLog, DailyFeedback, WorkoutExerciseGroup, EngageExperience, EngageBanner, EngageUserStatus, EngageEventLog, EngagePushNotification, EngagePushLog, Lead, LeadActivity, LeadTask, Tag, CustomFieldDefinition, CustomFieldValue, LeadFile, NotificationDevice, Notification, NotificationPreference, ReferralCommission, PayoutRequest, Conversation, ConversationParticipant, Message, DataDeletionRequest, ImportJob, ImportSource, ImportRecord, ImportEntityResult, GeminiUsageLog, CreditPackage, CreditPurchase, PaymentProviderAccount, WalletBalanceSnapshot, GatewayCustomer, PersonalBillingPlan, StudentSubscription, StudentBilling, ActivationFeeRecoveryOperation, PaymentAttempt, PaymentSplit, WalletLedgerEntry, WalletPayoutRequest, PaymentWebhookEvent, FeeRuleVersion, FinancialReconciliationRun, FinancialAuditLog, RoadmapStatus, RoadmapCategory, RoadmapFeature, RoadmapVote, RoadmapComment, RoadmapPoll, RoadmapPollOption, RoadmapPollVote, RoadmapAuditLog, LegalDocument, LegalAcceptance, PrivacyConsent, DataSubjectRequest, SecurityIncident, GymSettings, GymUnit, WorkspaceRoleGrant, WorkspaceInvitation, GymStaffProfile, WorkspaceSubscription. Conferir eventuais `@@map` antes de comparar nomes; este índice não interpreta mappings.

