r# 💃 TanzMatch - Monorepo

> Eine moderne Dating-App für Tanzbegeisterte. Frontend (React), Backend (Node.js) & Shared Types im Monorepo.

## 📁 Projektstruktur

```
tanzmatch/
├── frontend/                    # React/Vite App (Port 5173)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── backend/                     # Express.js API Server (Port 5000)
│   ├── src/
│   │   └── index.ts            # Main application entry
│   ├── dist/                    # Compiled output
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── packages/
│   └── types/                   # Shared TypeScript Types
│       ├── src/
│       │   └── index.ts         # All shared types
│       ├── dist/
│       └── package.json
│
├── package.json                 # Root package with workspaces
└── README.md
```

## 🚀 Getting Started

### Installation

```bash
# Install root dependencies & workspace dependencies
npm install

# Install specific workspace
npm install -w frontend
npm install -w backend
npm install -w packages/types
```

### Development

```bash
# Start Frontend (http://localhost:5173)
npm run dev

# Start Backend in development (http://localhost:5000)
npm run dev -w backend

# Start Backend on another port if 5000 is occupied
PORT=5002 npm run dev -w backend

# Start all workspaces at once
npm run dev:all
```

### Production Start

```bash
# Build backend first
npm run build:backend

# Start compiled backend on default port 5000
npm run start:backend

# Or override the port
PORT=5002 npm run start:backend
```

### Build

```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build:frontend
npm run build:backend
```

### Linting & Type Checking

```bash
# Lint all workspaces
npm run lint

# Type check all workspaces
npm run type-check
```

## 📦 Workspaces

### frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Routing**: React Router
- **UI Components**: Lucide React Icons
- **Port**: `5173`

### backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB via Mongoose
- **Port**: `5000`

### packages/types
- **Purpose**: Shared TypeScript Types
- **Used by**: Frontend & Backend
- **Includes**: User, Profile, Match, Message, Event types

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Profile
- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update profile

### Discovery
- `GET /api/profiles` - List all profiles
- `GET /api/profiles/:id` - Get specific profile

### Matches
- `GET /api/matches` - Get all matches
- `POST /api/matches` - Create new match (like, superlike, pass)

### Messages
- `GET /api/messages/:matchId` - Get messages for match
- `POST /api/messages` - Send message

### Events
- `GET /api/events` - List events
- `POST /api/events/:id/register` - Register for event

## 🔄 Shared Types Usage

### Frontend
```typescript
import type { User, Profile, Match } from '@tanzmatch/types';

const user: User = {
  id: '1',
  email: 'user@example.com',
  firstName: 'Max',
  lastName: 'Mustermann',
};
```

### Backend
```typescript
import type { AuthResponse, MatchRequest } from '@tanzmatch/types';

const response: AuthResponse = {
  token: 'jwt-token',
  user: {...},
};
```

## 🌍 Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=TanzMatch
```

### Backend (.env)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://...
JWT_SECRET=<at-least-32-random-characters>
JWT_EXPIRES_IN=15m
```

## 📚 Architecture Principles

- **Monorepo**: Single repository for Frontend, Backend & Shared
- **TypeScript**: Full type safety across all packages
- **Workspaces**: npm workspaces for dependency management
- **Shared Types**: Single source of truth for API contracts
- **API-First**: REST API with clear contracts

## 🛠️ Development Workflow

1. **Start Backend**: `npm run dev -w backend`
2. **Start Frontend**: `npm run dev`
3. **Make Changes**: Frontend uses API from Backend
4. **Update Types**: Modify `packages/types/src/index.ts`
5. **Both packages auto-update**: Through workspace references

## 📖 Documentation

### Frontend
See [frontend/README.md](frontend/README.md) for React-specific docs

### Backend
See [backend/README.md](backend/README.md) for API docs

### Types
See [packages/types/README.md](packages/types/README.md) for type definitions

## Deployment on Render

The root `render.yaml` describes a static frontend and an Express API. Create a Render Blueprint from this repository and set `MONGODB_URI` in Render's environment settings. The blueprint generates `JWT_SECRET` and connects the frontend and API host names. Keep all secret values in Render or local `.env` files; never add them to Git.

Profile photo uploads require `CLOUDINARY_URL`. Password reset remains unavailable until an email delivery provider is configured.

## 📝 License

MIT

## 👨‍💻 Author

Michael Koch

---

**Happy Dancing! 💃🕺**
