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
