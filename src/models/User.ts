export interface User {
  id?: number;
  username: string;
  email: string;
  password: string;
  created_at?: Date;
  last_login?: Date;
  login_streak?: number;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  created_at: Date;
  last_login?: Date;
  login_streak?: number;
  achievements?: UserAchievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserAchievement {
  achievement_id: string;
  user_id: number;
  unlocked_at: Date;
  progress: number;
  completed: boolean;
  name?: string;
  description?: string;
  icon?: string;
} 