<p align="center"><img src="public/icons/logo.svg" width="128" height="128" alt="IncidentIQ Logo"></p>

# IncidentIQ — AI-Powered Alert Triage for SREs

![Version](https://img.shields.io/badge/version-1.0.0-dc2626?style=flat-square)
![License](https://img.shields.io/badge/license-ISC-dc2626?style=flat-square)
![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-dc2626?style=flat-square&logo=googlechrome&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)

> Cut through alert noise with AI-driven triage — classify severity P0-P4, detect false positives, surface root causes, and generate Slack-ready incident summaries.

<p align="center">
  <img src="public/icons/icon128.png" alt="IncidentIQ Icon" width="128" />
</p>

## Features

- :rotating_light: **Priority Classification (P0-P4)** — Instantly classify alerts by severity with AI-powered analysis
- :no_entry_sign: **Noise Detection** — Identify and suppress false positives, duplicates, and non-actionable alerts
- :microscope: **Root Cause Analysis** — AI-assisted RCA suggestions based on alert patterns and historical context
- :arrow_up: **Escalation Paths** — Automated escalation recommendations with team routing and runbook links
- :speech_balloon: **Slack Summaries** — One-click generation of formatted Slack incident summaries
- :link: **PagerDuty Integration** — Pull alerts directly from PagerDuty and enrich with AI context
- :link: **OpsGenie Integration** — Seamless OpsGenie alert ingestion and triage
- :lock: **Firebase Auth** — Secure authentication with Google sign-in
- :new_moon: **Red/Dark Theme** — SRE-optimized dark interface with red severity accents

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript |
| Styling | Tailwind CSS |
| Build | Vite |
| Auth | Firebase |
| Integrations | PagerDuty API, OpsGenie API, Slack API |
| Platform | Chrome Extension (Manifest V3) |

## Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd alert-triage-ext
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Create a `.env` file with your Firebase, PagerDuty, and OpsGenie API credentials

4. **Build the extension**
   ```bash
   npm run build
   ```

5. **Load in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `dist` folder

## Usage

1. **Open IncidentIQ** — Click the extension icon or use the side panel
2. **Connect integrations** — Link your PagerDuty and/or OpsGenie accounts in Settings
3. **Triage alerts** — Paste alert payloads or pull them from connected services
4. **Review AI analysis** — See priority level, noise probability, and root cause suggestions
5. **Escalate** — Follow recommended escalation paths or customize your own
6. **Share to Slack** — Generate a formatted incident summary and copy it for Slack

### Priority Levels

| Level | Severity | Response Time |
|-------|----------|--------------|
| **P0** | Critical | Immediate |
| **P1** | High | < 15 min |
| **P2** | Medium | < 1 hour |
| **P3** | Low | < 4 hours |
| **P4** | Informational | Next business day |

## Architecture

```
alert-triage-ext/
├── public/
│   └── icons/              # Extension icons (16, 48, 128px)
├── src/
│   ├── components/         # React UI components
│   │   ├── AlertCard/      # Individual alert display
│   │   ├── TriagePanel/    # Main triage interface
│   │   └── EscalationPath/ # Escalation flow UI
│   ├── services/           # PagerDuty, OpsGenie, Slack APIs
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Priority logic, noise detection
│   └── App.tsx             # Main entry point
├── manifest.json           # Chrome Manifest V3 config
├── vite.config.ts          # Vite build configuration
├── tailwind.config.js      # Tailwind theme (red/dark)
└── package.json
```

## Screenshots

<p align="center">
  <img src="public/icons/logo.svg" alt="IncidentIQ Logo" width="128" />
</p>

| Icon | Size |
|------|------|
| ![Logo](public/icons/logo.svg) | SVG Logo |
| ![16px](public/icons/icon16.png) | 16x16 |
| ![48px](public/icons/icon48.png) | 48x48 |
| ![128px](public/icons/icon128.png) | 128x128 |

## License

ISC
