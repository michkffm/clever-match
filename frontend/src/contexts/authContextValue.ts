import { createContext } from 'react';
import type { User } from '../types/api';
export interface AuthContextType {
 user: User | null; isAuthenticated: boolean; isLoading: boolean; error: string | null;
 login: (email: string, password: string) => Promise<boolean>;
 loginAsGuest: () => Promise<boolean>;
 register: (email: string, password: string, firstName: string, lastName: string, zipCode: string) => Promise<boolean>;
 logout: () => Promise<void>; clearError: () => void;
}
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
