
# SafeSphere AI — Project Rules

**Version:** 1.0  
**Status:** Development Draft  
**Project:** SafeSphere AI

---

## 1. Purpose

These rules define the development, coding, security, privacy, testing, and documentation standards for SafeSphere AI.

All contributors should follow these rules when creating, modifying, testing, or deploying the application.

SafeSphere AI is a personal safety application. User privacy, secure access, clear communication, and responsible handling of emergency-related functionality must be prioritized.

---

## 2. General Development Rules

1. Keep the project structure organized.
2. Use clear and descriptive file, variable, and function names.
3. Write code that is easy for beginners to understand and maintain.
4. Avoid unnecessary duplication.
5. Do not remove existing working features without a clear reason.
6. Test changes before considering them complete.
7. Do not claim that a feature works unless it has been tested.
8. Keep documentation updated when implementation changes.
9. Do not introduce paid services without documenting the cost and obtaining approval.
10. Explain any required setup steps and dependencies.

---

## 3. Technology Rules

The current project stack is:

- Frontend: HTML, CSS, JavaScript.
- Backend: Python and FastAPI.
- Database: SQLite.
- Database access: SQLAlchemy, if used by the implementation.
- Email notifications: SMTP.
- SMS notifications: Twilio.
- API testing: FastAPI Swagger UI.

### Technology Guidelines

1. Keep frontend and backend responsibilities separate.
2. Use FastAPI routes for backend operations.
3. Keep database operations in the backend.
4. Do not connect browser JavaScript directly to SQLite.
5. Do not expose backend secrets to the frontend.
6. Confirm compatibility before adding new dependencies.
7. Record newly added dependencies in the appropriate requirements file.

---

## 4. Project Structure Rules

Keep related files grouped by responsibility.

A conceptual structure is:

```text
SafeSphere-AI/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── contacts.py
│   │       ├── incidents.py
│   │       └── alerts.py
│   │
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
│
├── PRD.md
├── ARCHITECTURE.md
├── RULES.md
└── README.md
```

**Important:** This is a suggested organization. Do not move or rename existing files unless the application imports, configuration, and startup commands are updated accordingly.

---

## 5. Frontend Rules

### HTML

1. Use semantic HTML elements where appropriate.
2. Keep page structure readable.
3. Use labels for form inputs.
4. Provide meaningful button text.
5. Use accessible names for interactive controls.
6. Avoid embedding secrets or private credentials in HTML.

### CSS

1. Keep styling organized and reusable.
2. Use responsive layouts.
3. Maintain readable text and sufficient contrast.
4. Make forms and buttons usable on desktop and mobile.
5. Avoid breaking existing layouts when adding features.
6. Keep visual states clear for loading, success, warning, and error messages.

### JavaScript

1. Keep frontend logic organized.
2. Use the existing API request helper where appropriate.
3. Handle network errors and unsuccessful HTTP responses.
4. Validate user input before sending requests, while also validating it on the backend.
5. Do not trust frontend validation as a security control.
6. Do not store SMTP or Twilio credentials in JavaScript.
7. Do not place authentication tokens in URLs.
8. Avoid displaying raw backend stack traces to users.

---

## 6. Backend Rules

1. Use FastAPI for API endpoints.
2. Validate incoming request data.
3. Use appropriate HTTP methods and status codes.
4. Keep authentication and authorization checks on the server.
5. Keep database access on the backend.
6. Handle expected errors safely.
7. Avoid exposing internal exceptions to users.
8. Keep secrets out of source code.
9. Use clear response structures.
10. Do not report an operation as successful unless the relevant operation actually succeeded.

### API Changes

When modifying an endpoint:

- Check its existing frontend callers.
- Preserve compatibility where possible.
- Update request and response handling if the schema changes.
- Test valid and invalid requests.
- Update API documentation when necessary.

---

## 7. Authentication Rules

1. Passwords must never be stored as plaintext.
2. Use a suitable password-hashing algorithm.
3. Verify credentials on the backend.
4. Require authentication for private user data.
5. Validate bearer tokens on protected endpoints.
6. Reject missing, invalid, or expired tokens as appropriate.
7. Derive the authenticated user identity from the verified token.
8. Never trust a client-supplied user ID as proof of identity.
9. Do not log passwords, tokens, or other authentication secrets.
10. Review token expiration and storage before public deployment.

---

## 8. Authorization and Data Ownership Rules

Every user's private data must remain associated with that user.

### Trusted Contacts

- Users may access only their own trusted contacts.
- Users must not update or delete another user's contacts.
- Contact ownership must be checked by the backend.

### Incidents

- Users may access only their own incident records.
- Users must not update or delete another user's incidents.
- Incident ownership must be checked by the backend.

### General

- Enforce ownership checks for every relevant operation.
- Do not rely only on hiding buttons in the frontend.
- Test access using more than one account.

---

## 9. Database Rules

1. Use the configured database layer.
2. Keep database credentials and configuration out of frontend code.
3. Validate data before saving it.
4. Maintain correct relationships between users and their records.
5. Handle database errors safely.
6. Avoid destructive schema changes without a backup and migration plan.
7. Do not delete user data as part of routine testing without permission.
8. Confirm that records belong to the authenticated user before modifying them.
9. Document schema changes.
10. Consider backups and persistence requirements before deployment.

---

## 10. Trusted Contact Rules

1. Validate contact names, email addresses, and phone numbers.
2. Save contacts under the authenticated user's account.
3. Do not expose contact information to other users.
4. Handle missing or invalid contact details clearly.
5. Do not send notifications to contacts without a valid destination.
6. Make it clear which contact details will be used for alerts.
7. Avoid unnecessary collection of personal information.

---

## 11. Incident Management Rules

1. Validate incident input.
2. Associate each incident with its authenticated owner.
3. Use clear incident statuses.
4. Prevent unauthorized access to incident records.
5. Avoid collecting unnecessary sensitive information.
6. Handle missing or invalid incident IDs safely.
7. Confirm that updates affect only the intended record.
8. Document changes to incident fields and status behavior.

---

## 12. SOS and Emergency Alert Rules

SOS functionality is safety-sensitive and must be implemented carefully.

### SOS Request

1. Require appropriate authentication.
2. Validate the alert request.
3. Retrieve contacts belonging to the authenticated user.
4. Attempt configured notification channels independently where possible.
5. Return separate results for email and SMS attempts.
6. Handle missing contacts and provider failures.
7. Avoid duplicate or accidental requests where practical.
8. Apply appropriate abuse prevention and rate limiting.

### Accurate Status Reporting

The application must distinguish between:

- Request submitted.
- Provider accepted the request.
- Provider confirmed delivery, if such information is available.
- Request failed.

Do not claim that an alert was delivered merely because the API returned HTTP 200.

### Emergency Safety

- Do not describe SafeSphere AI as a replacement for emergency services.
- Do not promise guaranteed emergency response.
- Do not promise guaranteed email or SMS delivery.
- Provide clear fallback guidance if notification attempts fail.
- Do not test the SOS feature using a real emergency.
- Use controlled test recipients during development.

---

## 13. Email and SMS Configuration Rules

### Email

1. Keep SMTP configuration in the backend environment.
2. Use provider-approved authentication.
3. Validate the sender configuration.
4. Handle authentication and connection errors.
5. Never expose SMTP passwords in API responses or logs.

### SMS

1. Keep Twilio credentials in backend configuration.
2. Use valid account credentials.
3. Use an authorized sender number or messaging service.
4. Handle provider authentication errors.
5. Respect provider account and destination restrictions.
6. Never expose Twilio tokens in frontend code or logs.

### Provider Status

Provider acceptance must not be confused with confirmed recipient delivery.

---

## 14. Environment and Secret Rules

1. Keep real credentials in a backend `.env` file or secure deployment secret store.
2. Never commit real `.env` credentials to Git.
3. Keep `.env.example` free of real secrets.
4. Use placeholder values in example configuration.
5. Do not paste credentials into public repositories, screenshots, or documentation.
6. Rotate any credential that may have been exposed.
7. Restart the backend after changing environment configuration when required.
8. Confirm the backend is loading the intended environment file.

Example `.env.example`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_email@example.com
SMTP_PASSWORD=replace_with_secret
SMTP_FROM=your_email@example.com

TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=replace_with_secret
TWILIO_PHONE_NUMBER=your_authorized_sender
```

These are placeholders, not working credentials.

---

## 15. Error Handling Rules

### Frontend

- Show clear, user-friendly errors.
- Handle failed network requests.
- Show loading feedback for long-running operations.
- Avoid misleading success messages.
- Do not expose sensitive backend details.

### Backend

- Validate inputs.
- Return appropriate HTTP status codes.
- Log useful diagnostic information safely.
- Avoid logging passwords, tokens, or provider secrets.
- Handle external service failures.
- Avoid returning raw stack traces to clients.

---

## 16. Privacy Rules

1. Collect only information needed for the application's functions.
2. Restrict private information to authorized users.
3. Explain what information is collected and why.
4. Avoid unnecessary retention of location data.
5. Do not expose trusted contact details publicly.
6. Avoid logging sensitive incident details unnecessarily.
7. Provide appropriate data deletion behavior where supported.
8. Review privacy requirements before public deployment.

---

## 17. UI and Accessibility Rules

1. Keep navigation understandable.
2. Use readable typography.
3. Maintain adequate color contrast.
4. Make important actions easy to identify.
5. Provide labels and useful error messages for forms.
6. Ensure interactive elements can be used with a keyboard where practical.
7. Make the layout responsive.
8. Do not communicate status using color alone.
9. Clearly distinguish ordinary actions from emergency-related actions.
10. Avoid confusing animations or confirmation dialogs during critical flows.

---

## 18. Testing Rules

Test changes before considering them complete.

### Authentication

- [ ] Registration with valid data.
- [ ] Registration with invalid data.
- [ ] Duplicate account handling.
- [ ] Login with valid credentials.
- [ ] Login with invalid credentials.
- [ ] Protected endpoint without a token.
- [ ] Protected endpoint with an invalid token.

### Trusted Contacts

- [ ] Add a contact.
- [ ] Retrieve contacts.
- [ ] Validate invalid contact information.
- [ ] Verify ownership across accounts.
- [ ] Test update and delete operations if implemented.

### Incidents

- [ ] Create an incident.
- [ ] Retrieve incidents.
- [ ] Update incident information if supported.
- [ ] Verify ownership across accounts.
- [ ] Test invalid input and IDs.

### SOS

- [ ] Submit an SOS request with controlled test data.
- [ ] Test when no contacts exist.
- [ ] Test email provider failure.
- [ ] Test SMS provider failure.
- [ ] Verify independent channel results.
- [ ] Verify that the UI does not falsely claim delivery.
- [ ] Confirm that credentials are not exposed.

### General

- [ ] Check browser console errors.
- [ ] Check backend terminal errors.
- [ ] Test API endpoints through Swagger UI.
- [ ] Test the frontend-to-backend connection.
- [ ] Test the interface at different screen sizes.

---

## 19. Git and Version Control Rules

1. Use Git to track source code changes.
2. Do not commit `.env` files containing real credentials.
3. Do not commit virtual environments.
4. Do not commit unnecessary generated files or local databases containing personal data.
5. Use meaningful commit messages.
6. Review changes before pushing.
7. Keep the repository organized.
8. Document important configuration requirements.

Suggested `.gitignore` entries:

```gitignore
# Python
__pycache__/
*.py[cod]
.venv/
venv/

# Environment secrets
.env
.env.*

# Allow the example configuration
!.env.example

# Local database files
*.db
*.sqlite
*.sqlite3

# Editor and operating system files
.vscode/
.DS_Store
Thumbs.db
```

Review these patterns against the project before applying them. Do not accidentally ignore files that the application needs to deploy.

---

## 20. Local Development Rules

### Backend

Use the project's virtual environment and run the backend from the backend directory.

```powershell
cd D:\work\SafeSphere-AI\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```powershell
cd D:\work\SafeSphere-AI
python -m http.server 5500
```

### Local URLs

```text
Frontend: http://127.0.0.1:5500/frontend/index.html
API docs: http://127.0.0.1:8000/docs
Health:   http://127.0.0.1:8000/api/health
```

These commands assume the previously discussed project structure. Adjust them if the actual folders or entrypoint differ.

---

## 21. Deployment Rules

Before deploying publicly:

1. Replace localhost API URLs with the hosted backend URL.
2. Enable HTTPS.
3. Configure CORS for trusted frontend origins.
4. Store secrets securely.
5. Verify database persistence.
6. Configure backups where appropriate.
7. Review authentication and authorization.
8. Add rate limiting to sensitive endpoints.
9. Test notification providers using controlled recipients.
10. Document privacy practices and application limitations.
11. Test the deployed frontend and backend together.
12. Do not claim production readiness before completing security and functional testing.

---

## 22. AI Feature Rules

If AI-assisted features are added in the future:

1. Clearly identify AI-generated information.
2. Do not present uncertain AI output as verified fact.
3. Do not rely on AI as the sole mechanism for emergency detection or response.
4. Avoid making unsupported claims about a user's safety.
5. Protect user data sent to any AI service.
6. Document whether the feature uses a local model or external API.
7. Document any costs, data handling, and limitations.
8. Test failure cases and misleading outputs.

---

## 23. Documentation Rules

Keep the following documents aligned with the actual implementation:

- `README.md` — setup, installation, and run instructions.
- `PRD.md` — product requirements and scope.
- `ARCHITECTURE.md` — system components and data flows.
- `RULES.md` — development and safety standards.

When an API route, database model, environment variable, or feature changes, update the relevant documentation.

Do not document planned features as if they are already implemented.

---

## 24. Definition of Done

A feature is considered complete only when:

- [ ] The implementation is finished.
- [ ] Input validation is present.
- [ ] Authentication and authorization are correct where required.
- [ ] Errors are handled.
- [ ] Existing features still work.
- [ ] Relevant tests have been performed.
- [ ] No secrets are exposed.
- [ ] Documentation is updated.
- [ ] The feature's limitations are clearly communicated.
- [ ] The feature has not been described as tested or working without evidence.

---

## 25. Final Project Rule

**Build SafeSphere AI to support users, protect their information, and communicate honestly.**

Prioritize secure access, privacy, reliable error handling, accessible design, and accurate status messages.

Never promise guaranteed emergency response or guaranteed notification delivery.

---

**Document Status:** Development Draft — review and update these rules as the actual implementation evolves.