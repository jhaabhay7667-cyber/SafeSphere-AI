
# SafeSphere AI — Project Memory

## 1. Project Overview

**Project Name:** SafeSphere AI

**Purpose:** A safety-focused web application designed to help users manage emergency contacts, report incidents, and initiate SOS alerts.

**Project Type:** Web application / Hackathon project

**Development Environment:** Windows + Visual Studio Code

---

## 2. Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, FastAPI |
| Database | SQLite |
| ORM | SQLAlchemy |
| Authentication | Bearer-token authentication |
| API Documentation | FastAPI Swagger UI |

---

## 3. Project Location

```text
D:\work\SafeSphere-AI
```

Expected project components include:

```text
SafeSphere-AI/
├── backend/
│   ├── app/
│   └── .venv/
├── frontend/
│   └── index.html
├── PRD.md
├── ARCHITECTURE.md
├── RULES.md
├── DESIGN.md
├── TASKS.md
└── MEMORY.md
```

**Note:** Verify the actual folder structure before creating or moving files. This is a reference structure, not a confirmed source-code audit.

---

## 4. Local Development Commands

### Start the Backend

Open a new VS Code terminal and run:

```powershell
cd D:\work\SafeSphere-AI\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Start the Frontend

Open another terminal:

```powershell
cd D:\work\SafeSphere-AI
python -m http.server 5500
```

### Local URLs

| Purpose | URL |
|---|---|
| Frontend | http://127.0.0.1:5500/frontend/index.html |
| Backend API | http://127.0.0.1:8000 |
| Swagger UI | http://127.0.0.1:8000/docs |
| Health check | http://127.0.0.1:8000/api/health |

---

## 5. Known API Endpoints

The following endpoints have been discussed in the project context. Verify their current implementation in the backend.

| Endpoint | Purpose |
|---|---|
| `/api/health` | Backend health check |
| `/api/auth/me` | Retrieve current authenticated user |
| `/api/contacts` | Emergency contact operations |
| `/api/incidents` | Incident reporting operations |
| `/api/alerts/sos` | SOS alert request |

The HTTP method, authentication requirements, request schema, and response schema should be checked in the current FastAPI code.

---

## 6. Frontend API Configuration

The frontend has been discussed with this API base URL:

```javascript
const API_BASE = "http://127.0.0.1:8000";
```

An API helper named `apiRequest()` has been discussed for making requests and attaching the bearer token.

The authentication token has been discussed as being stored in `sessionStorage`.

Verify these details against the current frontend source before changing them.

---

## 7. Main Application Features

### Authentication
- User registration
- Email and password login
- Authenticated API requests
- User profile retrieval
- Logout

### Emergency Contacts
- Add emergency contacts
- Display saved contacts
- Edit or remove contacts
- Associate contacts with the authenticated user

### SOS Alerts
- SOS button in the frontend
- Backend SOS request
- Email notification integration
- SMS notification integration, if configured
- Success and failure feedback

### Incident Reporting
- Submit incident details
- Store reports in the database
- Retrieve incident history
- Protect user-specific records

### Dashboard
- Main navigation
- Emergency action
- Emergency contact section
- Incident history
- User account information

---

## 8. Important SOS Button Distinction

Two SOS-related frontend controls have been discussed:

- `sosBtn`: Opens a `tel:112` link after confirmation.
- `sosButton`: Sends a POST request to `/api/alerts/sos`.

These are different actions and should not be assumed to be interchangeable.

The telephone action does not itself confirm that an alert was sent to emergency contacts. The backend action also does not guarantee that email or SMS delivery succeeded.

---

## 9. Known Notification Issues

### Email

A previous backend log showed an SMTP authentication failure.

Things to verify:
- SMTP server and port
- Correct username
- Valid SMTP credentials
- Whether the provider requires an app password
- Sender address configuration
- Whether the destination address is valid

### SMS

A previous Twilio response showed HTTP 401 with error code `20003`.

Things to verify:
- Account SID
- Authentication token
- Sender phone number or messaging service
- Account status and destination restrictions
- Whether trial-account limitations apply

**Security:** If previously shared credentials were real, revoke or rotate them. Store replacement secrets only in the backend environment configuration. Never place them in frontend JavaScript or commit them to GitHub.

Restart the backend after changing environment variables.

---

## 10. Notification Status Must Be Accurate

A successful HTTP response from the SOS endpoint does not necessarily mean that a notification was delivered.

The application should distinguish between:
- SOS request received
- Notification attempt started
- Notification accepted by provider
- Notification delivery confirmed, when confirmation is available
- Notification failed

Do not display a message such as “SMS delivered” unless the application has reliable delivery evidence.

---

## 11. Security and Privacy Notes

- Hash passwords before saving them.
- Keep API keys and notification credentials on the backend.
- Do not commit `.env` files.
- Validate user input.
- Protect private endpoints with authentication.
- Ensure users can access only their own contacts and incident records.
- Avoid exposing sensitive information in logs and API responses.
- Use HTTPS in production.
- Make clear that an SOS request is not a guaranteed emergency response.

---

## 12. Current Development Status

The following is a working checklist, not a verified audit of the current source code.

| Area | Status |
|---|---|
| Project setup | Needs verification |
| Authentication | Needs verification |
| Emergency contacts | Needs verification |
| SOS endpoint | Implemented or discussed; verify current behavior |
| Email notifications | SMTP authentication issue reported |
| SMS notifications | Twilio authentication issue reported |
| Incident reporting | Needs verification |
| Frontend integration | Needs verification |
| Security review | Pending |
| Deployment | Pending |
| Hackathon demo | Pending |

---

## 13. Next Steps

1. Open the project in VS Code.
2. Start the backend and frontend separately.
3. Check `/api/health` and `/docs`.
4. Test registration and login.
5. Test emergency contact operations.
6. Test incident reporting.
7. Review the SOS endpoint and its response.
8. Fix SMTP and Twilio configuration using valid credentials.
9. Test notifications with authorized test recipients.
10. Verify user-data ownership and authentication.
11. Prepare the hackathon demo.
12. Review deployment requirements before making the application public.

---

## 14. Instructions for Continuing Development

When continuing this project in a new conversation:

- Use this document as project context, not as proof that every feature is complete.
- Ask for the current file or error log when exact code changes are needed.
- Preserve existing working functionality when fixing bugs.
- Provide beginner-friendly, step-by-step instructions.
- Provide complete copy-paste-ready files when requested.
- Specify the exact file path for every code change.
- Clearly separate confirmed behavior from proposed changes.
- Never invent API routes, database fields, or configuration names.
- Test important features before marking them complete.

---

## 15. Project Limitations

SafeSphere AI is a software project and should not be represented as a guaranteed emergency-response service.

The current local setup should not be assumed to be production-ready. Public deployment requires appropriate security, persistent storage, reliable notification configuration, and testing.

**Last updated:** 2026-09-19