export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  created_at?: string;
}

export interface Difficulty {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
}

export interface Program {
  id: string;
  name: string;
  category: string;
  category_id: string | null;
  difficulty: string;
  difficulty_id: string | null;
  description: string;
  section: string;
  subtitle: string;
  is_featured: boolean;
  sort_order: number;
  image_url: string | null;
  phase: number | null;
  phase_group_id: string | null;
  phase_unlock_threshold: number | null;
  is_premium: boolean;
  /** Plan-only program — Programlar (browse) listesinde görünmez, plan günlerinde seçilebilir. */
  is_hidden: boolean;
  created_at?: string;
}

export interface Exercise {
  id: string;
  program_id: string;
  name: string;
  sets: number;
  reps: number;
  duration_seconds: number;
  rest_seconds: number;
  description: string;
  video_url: string | null;
  sort_order: number;
  created_at?: string;
}

export const SECTIONS = ["Atletik Performans", "Beceri Geliştirme"] as const;
export type Section = (typeof SECTIONS)[number];

// MARK: - Rewards (v3.3)

export interface Reward {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon: string;
  xp_cost: number;
  min_pro_months: number;
  stock: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const CLAIM_STATUSES = [
  "pending",
  "approved",
  "shipped",
  "delivered",
  "rejected",
  "cancelled",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export interface RewardClaim {
  id: string;
  user_id: string;
  reward_id: string;
  xp_spent: number;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  postal_code: string | null;
  status: ClaimStatus;
  status_note: string | null;
  tracking_code: string | null;
  pro_since: string | null;
  created_at: string;
  updated_at?: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  rejected: "Reddedildi",
  cancelled: "İptal",
};

// MARK: - Training Plans (v4.0)

export const DAY_TYPES = ["workout", "rest", "basketball", "recovery"] as const;
export type DayType = (typeof DAY_TYPES)[number];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  workout: "Antrenman",
  rest: "Dinlenme",
  basketball: "Basketbol",
  recovery: "Recovery",
};

export const INTENSITIES = ["low", "medium", "high", "elite"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const INTENSITY_LABELS: Record<Intensity, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  elite: "Elit",
};

export interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  weeks_count: number;
  image_url: string | null;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingPlanDay {
  id?: string;
  plan_id: string;
  day_index: number;
  day_type: DayType;
  /** @deprecated Plan günleri artık kendi egzersizlerini tutuyor. Eski iOS sürümleri için kolon korunuyor, yeni planlar null. */
  workout_program_id?: string | null;
  title: string;
  notes: string | null;
  estimated_duration_min: number | null;
  intensity: Intensity | null;
  /** Plan gününün workout kapak fotoğrafı. iOS WorkoutDetailView hero'da render edilir. */
  image_url: string | null;
  created_at?: string;
  /** Bu güne ait egzersizler. Snapshot — katalog egzersizlerinden kopyalanır veya manuel girilir. */
  exercises?: TrainingPlanDayExercise[];
}

/** Plan gününün egzersiz listesi. exercises tablosundan bağımsız (snapshot). */
export interface TrainingPlanDayExercise {
  id?: string;
  day_id?: string;
  name: string;
  sets: number;
  reps: number;
  duration_seconds: number;
  rest_seconds: number;
  description: string;
  video_url: string | null;
  sort_order: number;
  created_at?: string;
}
