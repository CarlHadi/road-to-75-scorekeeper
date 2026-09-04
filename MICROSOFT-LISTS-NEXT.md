# Microsoft Lists sync — next step

The PWA is structured for local-first entry. To sync directly to Microsoft Lists from the browser, the clean approach is Microsoft Entra ID + Microsoft Graph.

Required configuration (not yet filled in):

- Tenant ID
- Entra application (client) ID
- SharePoint site ID
- `Road to 75 Scores` list ID
- `Road to 75 Session Context` list ID

`config.js` already contains placeholders for these values.

The production sync flow will be:

1. Sign in with Microsoft.
2. Continue to save a complete session locally first.
3. POST eight score rows to Road to 75 Scores.
4. POST one context row to Road to 75 Session Context.
5. Mark the local session as synced.
6. If a network request fails, leave it queued locally for retry rather than losing the session.

This preserves the range-friendly offline behaviour while making Microsoft Lists the durable data source for Power BI.
