# NeuroFocus

App-based executive function training for neurodivergent high schoolers.  
Built by Maymuna Kabir, 11th Grade, Westview High School, Portland OR.  
OHSU PSI Program research project.

## Setup

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) to run on your phone.

## Stage 1 (Research MVP)

- ✅ Onboarding (4 screens)
- ✅ TimeWise module — time estimation training (Exercise A)
- ✅ Session data logging (AsyncStorage + CSV export)
- ✅ Weekly 3-item research check-in
- ✅ Home dashboard

## Modules (Stage 1 only)

| Module | Status |
|---|---|
| TimeWise (time estimation) | ✅ Built |
| PlanForward | 🚧 Stage 2 |
| FocusControl | 🚧 Stage 2 |
| MemoryBank | 🚧 Stage 2 |
| MoodBridge | 🚧 Stage 3 |
| ConfidenceCore | 🚧 Stage 3 |

## Research Data

Session logs stored locally via AsyncStorage.  
Export CSV: [admin screen — to be built in Stage 4]  
Participant codes: P001–P020 (assigned by researcher)

## Evidence Base

- Time estimation paradigm: Marx et al. (2021), European Child & Adolescent Psychiatry
- EF deficit effect sizes: Sadozai et al. (2024), Nature Human Behaviour  
- Closest existing study: Tamm et al. (2024), JADD — AIMS school-based EF intervention
