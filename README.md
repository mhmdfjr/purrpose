# Purrpose

> Track your hustle. Honor your humble. Balance is the ultimate productivity hack.

**Purrpose** is a gamified productivity and mental health web app. It splits your daily tasks into two categories: **Hustle** (productive work) and **Humble** (recovery & self-care). Purrpose rewards you for maintaining a healthy balance between the two.

## Features

- **Task Management**: Create, edit, complete, and delete daily tasks across Hustle and Humble categories with level (1-5) and duration tracking
- **Scoring System**: Earn points based on task intensity and duration, with built-in anti-abuse daily caps (16h/task, 24h/day)
- **Daily & Weekly Reports**: Visual breakdowns with charts showing task distribution, score distribution, and balance metrics
- **AI-Enhanced Suggestions**: Weekly personalized recommendations powered by Google Gemini
- **Weekly Leaderboard**: Compete in location-based groups (~15 users by city) with weighted scoring that factors in balance and completion rate
- **Badge System**: Earn Gold, Silver, and Bronze badges for weekly leaderboard rankings
- **Multi-Auth**: Sign in with email/password or Google OAuth

## Tech Stack

| Layer        | Technology                                        |
| ------------ | ------------------------------------------------- |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **UI**       | shadcn/ui, Radix UI, Neo Brutalism design system  |
| **Backend**  | Firebase (Firestore, Auth, Cloud Functions)       |
| **AI**       | Google Gemini 1.5 Flash                           |
| **Testing**  | Vitest, Firebase Rules Unit Testing               |
| **Deploy**   | Vercel (frontend) + Firebase (backend)            |

## Getting Started

### Prerequisites

- Node.js 20+
- A Firebase project (enable Authentication, Firestore, Cloud Functions)
- API keys: [ip2location.io](https://www.ip2location.io/) (free), [Google Gemini](https://ai.google.dev/) (free tier)

### Installation

```bash
git clone https://github.com/mhmdfjr/purrpose.git
cd purrpose
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable                                   | Description                                 |
| ------------------------------------------ | ------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase API key                            |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain                        |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase project ID                         |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket                     |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID                               |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase app ID                             |
| `FIREBASE_SERVICE_ACCOUNT`                 | Firebase Admin SDK service account JSON     |
| `IP2LOCATION_API_KEY`                      | ip2location.io API key for geolocation      |
| `GEMINI_API_KEY`                           | Google Gemini API key for AI suggestions    |
| `CRON_SECRET`                              | Random secret for Vercel cron authorization |

See `.env.example` for the full list including optional App Check and emulator variables.

### Development

Start the Next.js dev server:

```bash
npm run dev
```

To run with Firebase emulators (Auth, Firestore, Functions):

```bash
npm run emulators:build
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:rules    # Firestore security rules tests
```

## Deployment

### Frontend (Vercel)

Push to `main` for Vercel auto-deploys. Cron jobs for task cutover and weekly cycles are configured in `vercel.json`.

### Backend (Firebase)

```bash
firebase deploy --only functions,firestore:rules,firestore:indexes
```

## Documentation

| Document                           | Description                            |
| ---------------------------------- | -------------------------------------- |
| [PRD.md](PRD.md)                   | Product Requirements Document          |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture & design decisions |
| [DATABASE.md](DATABASE.md)         | Firestore schema & indexes             |
| [API.md](API.md)                   | API contracts                          |
| [DESIGN.md](DESIGN.md)             | UI/UX design system                    |
| [ROADMAP.md](ROADMAP.md)           | Milestone roadmap                      |
| [TASKS.md](TASKS.md)               | Task tracking                          |

## License

[MIT](LICENSE)
