// === API Types ===
// Alle Types für API Requests/Responses

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
  zipCode?: string;
  createdAt?: string;
  role?: 'user' | 'moderator' | 'admin';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Profile extends User {
  bio?: string;
  interests?: string[];
  danceStyles?: string[];
  profilePhotos?: string[];
  location?: {
    lat: number;
    lng: number;
    city: string;
  };
  preferences?: {
    minAge?: number;
    maxAge?: number;
    danceStyles?: string[];
    distance?: number;
  };
  privateProfile?: boolean;
}

export interface PublicProfile {
  id: string;
  firstName: string;
  age?: number;
  location?: {
    city: string;
    distance?: number;
  };
  profilePhoto?: string;
  profilePhotos?: string[];
  danceStyles?: string[];
  bio?: string;
  interests?: string[];
}

export interface Match {
  id: string;
  userId: string;
  type: 'like' | 'superlike' | 'pass';
  mutualMatch?: boolean;
  createdAt: string;
  unmatchedAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  matchId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location: string;
  danceStyle?: string;
  organizer: {
    id: string;
    name: string;
  };
  attendees?: number;
  registered?: boolean;
  createdAt: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// === Request Types ===
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  zipCode: string;
}

export interface UpdateProfileRequest {
  bio?: string;
  interests?: string[];
  danceStyles?: string[];
  preferences?: {
    minAge?: number;
    maxAge?: number;
    danceStyles?: string[];
    distance?: number;
  };
  privateProfile?: boolean;
}

export interface MatchRequest {
  userId: string;
  type: 'like' | 'superlike' | 'pass';
}

export interface MessageRequest {
  matchId: string;
  text: string;
}

// === Response Types ===
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchResults {
  profiles?: PublicProfile[];
  events?: Event[];
  query: string;
}
