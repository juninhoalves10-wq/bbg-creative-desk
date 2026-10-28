export type UserRole = 'admin' | 'bbg_user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  groupId: string;
  groupName: string;
  canReorderQueue: boolean;
  avatar_url?: string;
  created_at?: string;
}

export type DemandStatus =
  | 'na_fila'
  | 'em_producao'
  | 'em_aprovacao'
  | 'ajustes_solicitados'
  | 'aprovada'
  | 'cancelada'
  | 'pendente_autorizacao_extra'
  | 'recusada_bbg'
  | 'recusada_admin';

export interface MonthlyCompetency {
  id: string;
  group_id: string;
  competency_key: string; // e.g. '2026-10'
  year: number;
  month: number;
  quota_contracted: number;
  credits_used: number;
  credits_remaining: number;
  total_demands?: number;
  extra_demands?: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  group_id: string;
  competency_id: string;
  demand_id: string | null;
  demand_code?: string;
  demand_title?: string;
  amount: number;
  type: 'consumption' | 'refund' | 'adjustment';
  description: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface DemandDelivery {
  id: string;
  demand_id: string;
  version: number;
  title: string;
  release_notes: string | null;
  external_links: string | null;
  image_url?: string | null;
  delivered_by: string;
  delivered_by_name?: string;
  created_at: string;
}

export interface DemandFile {
  id: string;
  demand_id: string;
  delivery_id: string | null;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_category: 'briefing' | 'delivery';
  uploaded_by: string;
  uploaded_by_name?: string;
  created_at: string;
}

export interface DemandComment {
  id: string;
  demand_id: string;
  delivery_id: string | null;
  type: 'comment' | 'adjustment_request' | 'approval_note' | 'admin_note';
  comment: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface DemandTimelineEvent {
  id: string;
  demand_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata_json: string | null;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  created_at: string;
}

export interface Demand {
  id: string;
  code: string; // e.g. 'BBG-2026-001'
  group_id: string;
  competency_id: string;
  competency_key?: string;
  title: string;
  department: string;
  material_type: string;
  dimensions: string | null;
  briefing: string;
  required_texts: string | null;
  visual_references: string | null;
  reference_links: string | null;
  desired_deadline: string | null;
  agreed_deadline: string | null;
  agreed_deadline_updated_by: string | null;
  agreed_deadline_updated_at: string | null;
  deadline_admin_name?: string | null;
  status: DemandStatus;
  queue_position: number;
  is_extra: number | boolean;
  extra_tag_applied: number | boolean;
  extra_tag_text: string | null;
  extra_cost: number | null;
  extra_cost_terms: string | null;
  extra_evaluated_by: string | null;
  extra_evaluated_at: string | null;
  extra_evaluator_name?: string | null;
  extra_authorized_by: string | null;
  extra_authorized_at: string | null;
  extra_authorizer_name?: string | null;
  extra_rejection_reason: string | null;
  created_by: string;
  requester_name?: string;
  requester_email?: string;
  requester_dept?: string;
  created_at: string;
  real_request_date: string | null;
  is_retroactive: number | boolean;
  retroactive_registered_by: string | null;
  production_started_at: string | null;
  first_delivery_at: string | null;
  last_delivery_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approver_name?: string | null;
  approved_version: number | null;
  // Computed / aggregated
  delivery_count?: number;
  latest_version?: number;
  file_count?: number;
  comment_count?: number;
  deliveries?: DemandDelivery[];
  files?: DemandFile[];
  comments?: DemandComment[];
  timeline?: DemandTimelineEvent[];
}

export interface DashboardStats {
  competency: {
    id: string;
    key: string;
    year: number;
    month: number;
    contracted: number;
    used: number;
    remaining: number;
  };
  counts: {
    inQueue: number;
    inProduction: number;
    awaitingApproval: number;
    adjustments: number;
    extraPending: number;
    approved: number;
  };
  priorityItems: Demand[];
}

export interface NotificationItem {
  id: string;
  user_id: string | null;
  group_id: string;
  demand_id: string | null;
  demand_code?: string;
  title: string;
  message: string;
  type: string;
  is_read: number | boolean;
  created_at: string;
}
