/* Dance Types */
export type DanceCategory = 'standard' | 'latin' | 'disco' | 'latino-modern' | 'other';

export interface Dance {
  id: string;
  name: string;
  category: DanceCategory;
}

export const DANCES: Dance[] = [
  // Standard
  { id: 'waltz', name: 'Langsamwalzer', category: 'standard' },
  { id: 'vienese-waltz', name: 'Wiener Walzer', category: 'standard' },
  { id: 'slow-fox', name: 'Slow Fox', category: 'standard' },
  { id: 'tango', name: 'Tango', category: 'standard' },
  { id: 'quickstep', name: 'Quickstep', category: 'standard' },
  // Latin
  { id: 'cha-cha-cha', name: 'Cha-Cha-Cha', category: 'latin' },
  { id: 'samba', name: 'Samba', category: 'latin' },
  { id: 'rumba', name: 'Rumba', category: 'latin' },
  { id: 'paso-doble', name: 'Paso Doble', category: 'latin' },
  { id: 'jive', name: 'Jive', category: 'latin' },
  // Disco/Folk
  { id: 'discofox', name: 'Discofox', category: 'disco' },
  { id: 'bossa-nova', name: 'Bossa Nova', category: 'disco' },
  { id: 'madison', name: 'Madison', category: 'disco' },
  { id: 'rock-n-roll', name: "Rock'n'Roll", category: 'disco' },
  // Latino-Modern
  { id: 'salsa', name: 'Salsa', category: 'latino-modern' },
  { id: 'bachata', name: 'Bachata', category: 'latino-modern' },
  { id: 'merengue', name: 'Merengue', category: 'latino-modern' },
  { id: 'zouk', name: 'Zouk', category: 'latino-modern' },
  { id: 'kizomba', name: 'Kizomba', category: 'latino-modern' },
  { id: 'westcoast', name: 'Westcoast Swing', category: 'latino-modern' },
  // Other
  { id: 'lindy-hop', name: 'Lindy Hop', category: 'other' },
  { id: 'tango-arg', name: 'Tango Argentino', category: 'other' },
  { id: 'ballroom', name: 'Ballroom Tänze', category: 'other' },
  { id: 'hiphop', name: 'HipHop', category: 'other' },
  { id: 'ballet', name: 'Ballet', category: 'other' },
];

/* Profile Types */
export type Gender = 'M' | 'W' | 'D' | 'other';
export type Athleticism = 'very-sporty' | 'sporty' | 'normal' | 'not-sporty';
export type Figure = 'slim' | 'normal' | 'curvy' | 'muscular';
export type SearchPurpose = 'hobby' | 'dance-circle' | 'free-time' | 'professional' | 'balls' | 'events' | 'relocation';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  gender: Gender;
  height: number; // cm
  zipCode: string;
  city: string;
  athleticism: Athleticism;
  figure: Figure;
  bio: string;
  dances: { danceId: string; level: 1 | 2 | 3 | 4 | 5 }[]; // 1-5 Anfänger-Profi
  customDances: string[];
  searchPurposes: SearchPurpose[];
  photos: string[]; // URLs
  videos: string[]; // URLs
  calendar: boolean[]; // 7 days
  verified: boolean;
  online: boolean;
  created: Date;
  lastSeen: Date;
}

export interface PreviewProfile extends Omit<UserProfile, 'email' | 'zipCode'> {
  distance?: number; // km
  compatibility?: number; // %
}

/* Match Types */
export interface Match {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: Date;
  lastMessage?: string;
  unread: boolean;
}

/* Event Types */
export type EventStyle = 'salsa' | 'waltz' | 'tango' | 'bachata' | 'mixed';

export interface DanceEvent {
  id: string;
  title: string;
  style: EventStyle;
  date: Date;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  image?: string;
  capacity: number;
  registered: number;
}
