# Public website campaign measurement

The website records page views, booking-link clicks, phone and WhatsApp clicks, and the first focus inside a customer form. Campaign source, medium, name, content and term persist while navigating within a browser session. Internal offer and event attribution remains separate.

Successfully stored requests create one conversion row in the same transaction as the request. Honeypots, duplicate retries and failed storage do not create extra conversions. A corrected request with different meaningful details is a new request.

The `public_marketing_events` and `lead_marketing` tables contain only approved measurement metadata. They exclude customer names, phone numbers, form text, complete query strings and advertising identifiers. Do Not Track and Global Privacy Control are respected by the new measurement. Existing visitor analytics are unchanged.

Detailed marketing records older than 90 days are deleted during subsequent measurement or request activity. This is activity-driven cleanup, not a newly configured scheduled job. All timestamps are server UTC; a future dashboard can display Cairo time.

The current admin interface is unchanged. These queries provide a starting point for the later dashboard or an authorized reporting workflow:

```sql
-- Campaign visits and interactions during the previous 30 days.
SELECT campaign_source, campaign_medium, campaign_name, event_type,
       COUNT(*) AS events, COUNT(DISTINCT visitor_id) AS visitors
FROM public_marketing_events
WHERE created_at >= (unixepoch('now') - 30 * 86400) * 1000
GROUP BY campaign_source, campaign_medium, campaign_name, event_type;

-- Genuine saved requests, not client-reported success events.
SELECT campaign_source, campaign_medium, campaign_name, request_type,
       COUNT(*) AS saved_requests
FROM lead_marketing
WHERE created_at >= (unixepoch('now') - 30 * 86400) * 1000
GROUP BY campaign_source, campaign_medium, campaign_name, request_type;
```

Example campaign link:

`https://esoticaegypt.com/en/booking?utm_source=instagram&utm_medium=paid_social&utm_campaign=service_campaign`

Campaign fields must contain campaign labels only. Never put a customer name, email address or phone number in a UTM parameter.
