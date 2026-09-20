
# SafeSphere AI — Product Requirements Document (PRD)

**Project Name:** SafeSphere AI  
**Document Type:** Product Requirements Document  
**Version:** 1.0 (Draft)  
**Status:** In Development  
**Platform:** Web Application  
**Frontend:** HTML, CSS, JavaScript  
**Backend:** Python, FastAPI  
**Database:** SQLite  
**Project Type:** AI-assisted personal safety and emergency alert system  

---

## 1. Project Overview

SafeSphere AI is a web-based personal safety platform designed to help users manage trusted contacts, report safety incidents, and initiate emergency alerts from a centralized dashboard.

The platform aims to provide a simple and accessible interface for users who may need to record an incident, contact trusted people, or access emergency assistance.

The application uses a frontend built with HTML, CSS, and JavaScript, a Python FastAPI backend, and an SQLite database for storing application data.

Email and SMS notifications are intended to be sent through external providers. Successful notification delivery depends on valid provider credentials, account permissions, network access, and recipient availability.

## 2. Problem Statement

During an emergency or unsafe situation, users may find it difficult to quickly contact trusted people or organize important incident information.

SafeSphere AI aims to bring key safety-related functions into one web application, including:

- Managing trusted contacts.
- Creating and tracking safety incidents.
- Accessing an emergency alert feature.
- Viewing safety-related information through a dashboard.
- Sending notifications to configured contacts when provider integrations are available.

## 3. Product Goals

### 3.1 Primary Goals

1. Provide a simple, user-friendly safety dashboard.
2. Allow users to register and log in securely.
3. Allow users to add, view, update, and remove trusted contacts.
4. Allow users to create and manage incident records.
5. Provide an SOS workflow for notifying trusted contacts.
6. Support email and SMS integrations.
7. Store application data in a database.
8. Provide clear feedback when an action succeeds or fails.

### 3.2 Secondary Goals

- Make the interface responsive across desktop, tablet, and mobile screens.
- Keep the codebase understandable and maintainable.
- Support future expansion of safety-related features.
- Provide a foundation for future AI-assisted safety functionality.

## 4. Target Users

### 4.1 General Users

People who want to manage trusted contacts and access safety-related tools.

### 4.2 Students

Students who may want to maintain emergency contact information and record safety incidents.

### 4.3 Working Professionals

People who want convenient access to trusted contacts and emergency alert functionality.

### 4.4 Administrators

Authorized maintainers responsible for managing the application and its technical configuration.

**Note:** Administrative capabilities and permissions must be explicitly implemented before being considered available.

## 5. Scope

### 5.1 In Scope

- User registration and login.
- Authenticated API requests.
- User dashboard.
- Trusted contact management.
- Incident management.
- SOS alert requests.
- Email and SMS provider integrations.
- SQLite persistence.
- API health endpoint.
- Error messages and operation status feedback.

### 5.2 Out of Scope for the Initial Version

- Guaranteed emergency response.
- Guaranteed SMS or email delivery.
- Direct connection to police, ambulance, or government emergency systems.
- Continuous background location tracking.
- Automatic emergency detection.
- A native Android or iOS application.
- A production-grade AI threat detection system unless separately implemented and tested.

## 6. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML |
| Styling | CSS |
| Client-side logic | JavaScript |
| Backend framework | Python FastAPI |
| Database | SQLite |
| Database access | SQLAlchemy, if configured |
| Authentication | Bearer-token authentication |
| Password security | Password hashing |
| Email | SMTP |
| SMS | Twilio |
| API testing | FastAPI Swagger UI |

The exact library versions and authentication implementation should be confirmed against the project's dependency files and source code.

## 7. Functional Requirements

### FR-01: User Registration

The system should allow a new user to create an account using the required registration fields.

**Expected behavior:**

- Validate required fields.
- Validate email format.
- Prevent duplicate accounts using the same email, where email is the account identifier.
- Store a password hash rather than a plaintext password.
- Return a clear success or error response.

### FR-02: User Login

The system should allow registered users to log in.

**Expected behavior:**

- Accept the user's login credentials.
- Verify the submitted password against the stored password hash.
- Return an authentication token when credentials are valid.
- Reject invalid credentials without revealing sensitive account information.
- Require authentication for protected endpoints.

### FR-03: Current User

The system should provide a way for an authenticated user to retrieve their account information.

**Expected behavior:**

- Validate the bearer token.
- Return information associated with the authenticated account.
- Reject missing or invalid authentication.

### FR-04: Dashboard

The dashboard should provide access to the application's main safety functions.

**Expected behavior:**

- Provide navigation to incidents and trusted contacts.
- Provide access to the SOS workflow.
- Display relevant user or application information available from the backend.
- Show loading, success, empty, and error states where appropriate.

### FR-05: Trusted Contact Management

The system should allow users to manage their trusted contacts.

**Expected behavior:**

- Add a trusted contact.
- View saved contacts.
- Update contact information, if supported by the implemented API.
- Delete a contact, if supported by the implemented API.
- Associate contacts with the correct authenticated user.
- Validate contact details before saving.

**Contact fields to confirm in the implementation:**

- Contact name.
- Email address.
- Phone number.
- User association.

### FR-06: Incident Management

The system should allow authenticated users to manage safety incident records.

**Expected behavior:**

- Create an incident.
- Retrieve incident records belonging to the authenticated user.
- Update incident details or status where supported.
- Delete an incident where supported.
- Validate incoming data.
- Prevent users from accessing another user's private incident records.

**Incident fields to confirm in the implementation:**

- Incident title.
- Description.
- Status.
- Location.
- Creation timestamp.

### FR-07: SOS Alert

The system should provide an SOS workflow that attempts to notify the user's trusted contacts.

**Expected behavior:**

1. The user initiates an SOS request.
2. The frontend sends the request to the backend.
3. The backend authenticates the user.
4. The backend retrieves the user's trusted contacts.
5. The backend attempts configured notification methods.
6. The backend returns a result for each attempted notification.
7. The frontend displays the result clearly.

Possible request information may include:

- Alert title.
- Alert message.
- Location text.
- Latitude.
- Longitude.

The exact request schema must match the implemented backend.

### FR-08: Email Notifications

The system may send email notifications through SMTP.

**Expected behavior:**

- Read SMTP settings from backend configuration.
- Never expose SMTP credentials to the frontend.
- Attempt to send a notification to eligible contacts.
- Handle authentication, connection, and sending errors.
- Report the result of the email attempt.

An accepted SMTP request does not guarantee that the recipient has read or received the email.

### FR-09: SMS Notifications

The system may send SMS notifications through Twilio.

**Expected behavior:**

- Read Twilio credentials from backend configuration.
- Never expose Twilio credentials to the frontend.
- Attempt to send SMS messages to eligible contacts.
- Handle provider authentication and request errors.
- Report the result of the SMS attempt.

A provider-accepted SMS request does not guarantee delivery to the recipient.

### FR-10: API Health Check

The backend should provide a health endpoint.

**Expected behavior:**

- Return a response indicating whether the API is reachable.
- Use the health endpoint during local development and basic diagnostics.

A health response alone does not prove that email, SMS, database migrations, or every application feature is working.

### FR-11: Error Handling

The application should communicate failures in a clear and useful way.

Examples include:

- Invalid login details.
- Missing authentication.
- Invalid form input.
- Database errors.
- Missing trusted contacts.
- Email provider authentication failure.
- SMS provider authentication failure.
- Network or server errors.

The application must not display passwords, API tokens, or provider secrets in error messages.

## 8. User Stories

### Account

- As a user, I want to register so I can create an account.
- As a user, I want to log in so I can access my information.
- As a user, I want protected data to be accessible only to my account.

### Trusted Contacts

- As a user, I want to add trusted contacts so I can maintain emergency contact information.
- As a user, I want to view my saved contacts so I can check their details.
- As a user, I want to update or remove contacts when their details change.

### Incidents

- As a user, I want to record an incident so I can keep a personal record.
- As a user, I want to view my incidents so I can track their status.
- As a user, I want to update an incident when its information changes.

### SOS

- As a user, I want to initiate an SOS alert so the application can attempt to notify my trusted contacts.
- As a user, I want to see whether email or SMS requests succeeded or failed.
- As a user, I want clear instructions if a notification cannot be sent.

## 9. Main User Flows

### 9.1 Registration and Login

1. User opens the application.
2. User chooses registration or login.
3. User enters the required information.
4. Frontend sends the request to the backend.
5. Backend validates the request.
6. Backend returns the appropriate response.
7. On successful login, the frontend stores the authentication token according to the implemented session strategy.
8. User accesses protected application features.

### 9.2 Trusted Contact Flow

1. User logs in.
2. User opens the trusted contacts section.
3. User enters contact details.
4. Frontend submits the details to the backend.
5. Backend validates and saves the contact.
6. Frontend refreshes the contact list and displays the result.

### 9.3 Incident Flow

1. User logs in.
2. User opens the incidents section.
3. User creates or selects an incident.
4. Frontend sends the appropriate API request.
5. Backend verifies access and processes the request.
6. Frontend displays the updated incident information.

### 9.4 SOS Flow

1. User initiates the SOS feature.
2. Application confirms or collects the required alert information.
3. Frontend submits an authenticated SOS request.
4. Backend retrieves the user's trusted contacts.
5. Backend attempts configured email and SMS notifications.
6. Backend returns per-channel results.
7. Frontend displays which attempts were accepted or failed.
8. If notification attempts fail, the application provides a clear fallback instruction.

**Emergency safety note:** SafeSphere AI should not be presented as a replacement for contacting local emergency services directly.

## 10. API Requirements

The following endpoints have been referenced in the project discussion. Their exact methods, request bodies, response schemas, and authentication requirements must be confirmed against the actual source code.

| Endpoint | Purpose |
|---|---|
| `/api/health` | Check API availability |
| `/api/auth/me` | Retrieve current authenticated user |
| `/api/contacts` | Trusted contact operations |
| `/api/incidents` | Incident operations |
| `/api/alerts/sos` | Initiate SOS notification attempts |

The authentication registration and login paths should be documented from the actual router implementation.

### API Design Expectations

- Use appropriate HTTP methods and status codes.
- Validate request data.
- Return consistent response structures.
- Protect private endpoints.
- Avoid exposing internal exceptions or secrets.
- Document endpoints through FastAPI's OpenAPI/Swagger interface.

## 11. Data Requirements

The application uses SQLite for local persistence.

### 11.1 User Data

Potential fields, subject to source-code confirmation:

- User identifier.
- Email address.
- Password hash.
- Account creation timestamp.

### 11.2 Trusted Contact Data

Potential fields, subject to source-code confirmation:

- Contact identifier.
- User identifier.
- Contact name.
- Email address.
- Phone number.

### 11.3 Incident Data

Potential fields, subject to source-code confirmation:

- Incident identifier.
- User identifier.
- Title.
- Description.
- Status.
- Location information.
- Creation and update timestamps.

### Data Integrity Requirements

- Each private record must be associated with its owner.
- The backend must enforce ownership checks.
- Required fields must be validated.
- Passwords and provider credentials must not be stored as plaintext application data.
- Database errors must be handled safely.

## 12. Security Requirements

Security is a core requirement because the application may store personal contact information and safety-related records.

### 12.1 Authentication

- Require authentication for private user data.
- Validate bearer tokens on protected endpoints.
- Reject expired, invalid, or missing tokens.
- Use a secure token lifecycle appropriate for the deployment environment.

### 12.2 Password Protection

- Store password hashes, not plaintext passwords.
- Use a suitable password-hashing algorithm and configuration.
- Avoid logging passwords.
- Apply reasonable password validation rules.

### 12.3 Authorization

- Users must access only their own contacts and incidents.
- The backend must derive the authenticated user from the verified token.
- Do not trust a user ID supplied by the frontend as proof of ownership.

### 12.4 Secrets Management

- Store SMTP and Twilio credentials in backend environment configuration.
- Do not commit `.env` files containing secrets.
- Do not include credentials in frontend JavaScript.
- Use deployment secrets or environment variables in hosted environments.
- Rotate credentials if they are accidentally exposed.

### 12.5 Transport and Deployment

- Use HTTPS for production deployment.
- Configure CORS for explicitly trusted frontend origins.
- Avoid exposing development servers publicly.
- Apply appropriate request size limits and rate limits, particularly to the SOS endpoint.

### 12.6 Privacy

- Collect only data required for the application's functions.
- Explain what information is stored and used.
- Avoid retaining location information longer than necessary.
- Restrict access to private incident and contact information.

## 13. Non-Functional Requirements

### 13.1 Usability

- The interface should be understandable to first-time users.
- Important actions should be clearly labeled.
- Errors should explain what the user can do next.

### 13.2 Responsiveness

- The interface should adapt to desktop, tablet, and mobile screen sizes.
- Forms and buttons should remain usable on smaller screens.

### 13.3 Reliability

- API failures should not crash the frontend.
- Notification channels should be handled independently where possible.
- Failed notification attempts should be reported accurately.
- The application should not claim an alert was delivered without delivery evidence.

### 13.4 Maintainability

- Keep frontend, backend, database, and configuration responsibilities organized.
- Use clear file and function names.
- Document setup and run commands.
- Keep configuration separate from application logic.

### 13.5 Performance

- Common dashboard and data retrieval requests should complete within a reasonable time under local development conditions.
- Avoid unnecessary repeated API calls.
- Show loading feedback during longer operations.

## 14. External Dependencies

### 14.1 SMTP Email Provider

Email functionality depends on:

- A reachable SMTP server.
- Valid authentication.
- An authorized sender address.
- Correct backend environment configuration.
- Recipient address validity.

### 14.2 Twilio SMS Provider

SMS functionality depends on:

- A valid Twilio Account SID.
- A valid authentication token.
- An authorized sender number or messaging service.
- Account status and permissions.
- Recipient and destination eligibility.
- Provider availability and network connectivity.

Provider-specific restrictions may apply, including trial account limitations.

## 15. Known Development Status

This section reflects the development information shared so far and is not a complete source-code audit.

### Reported as Running

- FastAPI backend starts locally.
- Health endpoint is available.
- Requests to `/api/auth/me`, `/api/incidents`, and `/api/contacts` have returned successful statuses in the reported logs.
- SOS requests reach the backend.

### Reported Issues

- SMTP authentication failed.
- Twilio returned HTTP 401 with error code `20003`, indicating an authentication problem.
- Successful HTTP handling of an SOS request does not establish that notifications were delivered.

### Current Assessment

The reported logs suggest that the backend is reachable and several API routes are responding. The email and SMS integrations still require credential and configuration troubleshooting.

A complete assessment requires testing the actual frontend, database behavior, authorization boundaries, notification results, and deployment configuration.

## 16. Acceptance Criteria

The initial version can be considered ready for a controlled demonstration when the following checks pass:

### Account and Access

- [ ] A user can register successfully.
- [ ] Duplicate registration is handled.
- [ ] A user can log in with valid credentials.
- [ ] Invalid credentials are rejected.
- [ ] Protected endpoints reject unauthenticated requests.
- [ ] One user cannot access another user's private records.

### Trusted Contacts

- [ ] A user can add a trusted contact.
- [ ] Saved contacts appear in the contact list.
- [ ] Invalid contact data is rejected.
- [ ] Contact ownership is enforced.
- [ ] Update and delete operations work if included in the implementation.

### Incidents

- [ ] A user can create an incident.
- [ ] The user can retrieve their own incidents.
- [ ] Incident status or details can be updated if supported.
- [ ] Incident ownership is enforced.

### SOS

- [ ] The SOS request reaches the backend.
- [ ] The backend identifies the authenticated user.
- [ ] The backend retrieves the user's trusted contacts.
- [ ] Email and SMS are attempted only when properly configured.
- [ ] Each notification channel reports its own result.
- [ ] Failed provider authentication is displayed clearly.
- [ ] The interface does not claim delivery when only provider acceptance is known.
- [ ] A fallback instruction is available when notification attempts fail.

### General

- [ ] The frontend works on supported screen sizes.
- [ ] Loading and error states are understandable.
- [ ] Secrets are not exposed in frontend code or version control.
- [ ] Setup instructions are documented.
- [ ] The project is tested using the intended local run commands.

## 17. Testing Plan

### 17.1 Manual Functional Testing

Test registration, login, dashboard access, contact operations, incident operations, and SOS requests using valid and invalid inputs.

### 17.2 API Testing

Use FastAPI Swagger UI or an API client to verify:

- Request validation.
- Response schemas.
- Authentication behavior.
- Error handling.
- Ownership enforcement.

### 17.3 Notification Testing

Use controlled test recipients and verify:

- SMTP configuration.
- Twilio authentication.
- Provider acceptance responses.
- Provider delivery status where available.
- Failure behavior when credentials are missing or invalid.

Do not use a real emergency as a test.

### 17.4 Security Testing

Verify:

- Passwords are hashed.
- Tokens are validated.
- Private records cannot be accessed across accounts.
- Secrets are excluded from frontend files and Git.
- SOS requests cannot be abused without appropriate controls.

## 18. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Invalid SMTP credentials | Validate backend configuration and use provider-approved authentication |
| Invalid Twilio credentials | Confirm account SID/token and authorized sender configuration |
| Notification not delivered | Report provider acceptance separately from delivery status |
| Unauthorized access | Enforce authentication and per-user authorization |
| Accidental secret exposure | Use environment variables and rotate exposed credentials |
| False confidence during emergencies | Clearly communicate limitations and provide direct emergency-service guidance |
| Provider outage | Display failure status and provide a fallback path |
| Excessive SOS requests | Add authentication, rate limiting, and abuse safeguards |

## 19. Future Enhancements

Possible future features, subject to feasibility and safety review:

- Progressive Web App support.
- Optional location sharing with explicit user consent.
- Improved incident history and filtering.
- Notification delivery-status tracking.
- Accessibility improvements.
- Additional languages.
- Carefully scoped AI assistance for safety information.
- Automated testing and monitoring.
- Production database and deployment configuration.

Any AI-assisted feature should clearly communicate its limitations and should not be treated as a substitute for emergency services or professional judgment.

## 20. Deployment Considerations

The current local development setup uses a FastAPI backend and a separately served frontend.

Before public deployment:

- Configure a production database strategy.
- Configure HTTPS.
- Set production CORS origins.
- Store secrets using the hosting provider's secret management.
- Configure email and SMS providers for production use.
- Add rate limiting and monitoring.
- Review authentication and authorization.
- Test database backups and recovery.
- Provide privacy information and user-facing safety limitations.
- Avoid relying on localhost URLs in a public frontend.

The local development configuration should not be treated as production-ready without these checks.

## 21. Success Metrics

Potential metrics for evaluating the project demonstration include:

- Registration and login flow completion.
- Successful trusted-contact creation and retrieval.
- Successful incident creation and retrieval.
- Correct authorization behavior.
- Accurate reporting of email and SMS request outcomes.
- Number of critical test cases passed.
- Usability feedback from test users.

Metrics should be measured through controlled testing and should not imply guaranteed real-world emergency outcomes.

## 22. Open Questions

The following items should be confirmed against the implementation and project goals:

1. What exact fields are required during registration?
2. Which token format and expiration strategy are implemented?
3. Which trusted-contact update and delete operations exist?
4. What is the exact incident schema?
5. Does the SOS request support optional coordinates?
6. Does the application track provider delivery status or only request acceptance?
7. Is there an implemented administrator role?
8. Which frontend pages and dashboard widgets are complete?
9. Which features are intended for the first public deployment?
10. What privacy policy and data-retention rules will apply?

## 23. Development Phases

### Phase 1: Core Application

- Registration and login.
- Protected backend routes.
- Dashboard.
- Trusted contacts.
- Incident management.

### Phase 2: SOS Integrations

- SOS request flow.
- SMTP configuration.
- Twilio configuration.
- Per-channel result reporting.
- Error handling and fallback instructions.

### Phase 3: Testing and Security

- Authentication and ownership tests.
- Form validation.
- API error handling.
- Secret management.
- Rate limiting and abuse protection.

### Phase 4: Deployment Preparation

- Production configuration.
- HTTPS and CORS.
- Database deployment strategy.
- Provider configuration.
- Documentation and controlled demonstration.

## 24. Conclusion

SafeSphere AI is a personal safety web application in development, built around account access, trusted contact management, incident records, and SOS notification attempts.

The current project foundation uses HTML, CSS, JavaScript, FastAPI, and SQLite. Email and SMS integrations depend on external provider configuration and must be tested independently.

The project should communicate its capabilities accurately, protect user information, and avoid promising emergency response or guaranteed notification delivery.

---

**Document Status:** Draft — confirm all endpoint schemas, implemented features, and security controls against the actual source code before treating this PRD as final.