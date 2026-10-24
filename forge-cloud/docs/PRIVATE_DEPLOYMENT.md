# Private cloud deployment — gated, invite-only

**This is NOT an approved production-launch playbook.** The application can be hosted for a small, controlled private evaluation; real users and payments must not be activated until independent review and operating controls exist.

1. Obtain a private, TLS-protected deployment environment. Put an authentication-aware gateway or VPN in front of the beta hostname so only intended testers can even reach the application. Configure ingress/network policy and strict firewall rules; do not publish an unprotected port 5200.
2. Choose a dedicated persistent encrypted volume for `FORGE_DB_PATH` and regularly back it up; TEST RESTORE to a separate environment. This SQLite build supports **one application instance only**. Multi-replica/horizontal production requires PostgreSQL migration.
3. Set runtime secrets via the deployment host's secret manager, not source control. For a new installation, execute `FORGE_ADMIN_EMAIL=... FORGE_ADMIN_PASSWORD=... npm run admin:create` *once*, then remove the bootstrap password from the environment. Use a unique 14+ character password.
4. Set `NODE_ENV=production`, `FORGE_PUBLIC_ORIGIN=https://private-forge.example` (must exactly match browser origin), and configure the TLS proxy to forward traffic to the service. For remote bind, set `FORGE_BIND_HOST=0.0.0.0` and `FORGE_ALLOW_REMOTE=YES` explicitly. Confirm `Secure`, `HttpOnly` and `SameSite=Strict` cookies.
5. Enable external gateway-level authentication/allowlisting, WAF/rate limits, centralized logs with redaction, traffic and availability monitoring, and a named incident responder before admitting invitees.
6. Smoke-test role separation, mission ownership, safety holds, review notes and backup restore. Review `docs/RELEASE_GATES.md`. Only administrators should create invitations; invitation tokens must be transferred privately and cannot be viewed again.
7. Configure source feeds only after reviewing data usage rights. `FORGE_GREENHOUSE_BOARDS` is an operator-maintained list of approved Greenhouse public board tokens; `USAJOBS_API_KEY` and `USAJOBS_USER_AGENT` require official API onboarding. Run admin feed refresh manually, monitor source errors and verify displayed URLs.

The container sample `Dockerfile` intentionally provides only the app runtime. It does **not** provide TLS termination, backups, database HA, WAF, security monitoring, email, identity proofing, screening or legal authorization. Those are externally operated requirements.
