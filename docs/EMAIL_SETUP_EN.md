# Website email notification setup

The public website already contains a durable notification outbox. Sending remains disabled until the provider and Cloudflare variables are configured. No mailbox password is required.

1. Create or sign in to the dedicated Esotica account at https://resend.com/.
2. Add the owned domain `esoticaegypt.com` in Resend Domains. Add only the DNS records shown by Resend in the domain's Cloudflare DNS settings. Preserve existing website and mailbox records.
3. Wait for the sending domain verification to succeed. Choose a sender on that domain, for example `alerts@esoticaegypt.com`.
4. Create a sending-only Resend key restricted to that domain where available. Store it directly in Cloudflare Pages > esotica-auto-egypt > Settings > Variables and Secrets, production environment. Never paste it into chat, a repository, a document, or a screenshot.
5. Configure these production values:

| Variable | Value | Storage |
| --- | --- | --- |
| `RESEND_API_KEY` | Dedicated Resend sending key | Encrypted secret |
| `LEAD_ALERT_FROM` | Verified sender on the owned domain | Text |
| `LEAD_ALERT_TO` | The team's approved receiving address | Text or encrypted secret |

6. Redeploy the existing website without changing its D1 binding or admin credentials. `/api/health` must report `emailAlertsConfigured: true`.
7. Send one clearly labelled test website request, confirm provider acceptance, and verify arrival in the receiving inbox, including Spam. Only then report email delivery as verified.

Notifications contain request type, request number and the admin link. Customer names, phone numbers and message content are excluded. Only new requests after configuration are queued; historical requests are not automatically emailed.

The existing retry implementation uses bounded attempts and a stable idempotency key. Retries are triggered by subsequent activity and authenticated existing tools; no new scheduled worker is provisioned by this release. Provider acceptance does not by itself prove inbox delivery.
