"use client";

import { WorkspaceSettingsView } from "@/components/settings/workspace-settings-view";
import type { WorkspaceBrandingData } from "@/components/application/workspace-branding-form";

export interface StaffMemberOption {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export interface DsrRequestItem {
  id: string;
  type: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
  requesterName: string;
  notes: string | null;
}

export interface GymSettingsClientProps {
  workspace: WorkspaceBrandingData & {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
    importCredits?: number;
  };
  isCurrentOwner: boolean;
  currentUserId: string;
  eligibleStaffMembers: StaffMemberOption[];
  recentRequests?: DsrRequestItem[];
  privacySubjects: { userId: string; name: string }[];
}

export function GymSettingsClient({
  workspace,
  isCurrentOwner,
  currentUserId,
  eligibleStaffMembers,
  privacySubjects,
}: GymSettingsClientProps) {
  return (
    <WorkspaceSettingsView
      role="gym"
      workspace={workspace}
      isCurrentOwner={isCurrentOwner}
      currentUserId={currentUserId}
      eligibleStaffMembers={eligibleStaffMembers}
      privacySubjects={privacySubjects}
      defaultTab="marca"
    />
  );
}
