# Road to 75 Scorekeeper v0.2.1

A local-first PWA for recording KATTA-style walk-back scores and session context on a phone.

## v0.2 adds

- Microsoft Entra sign-in
- Microsoft Graph sync to the two Road to 75 Microsoft Lists
- Local-first saving before any cloud operation
- Per-session sync status in History
- Safe retry: the app checks for existing Session ID / round combinations before creating missing rows

## Microsoft Lists mapping

### Road to 75 Scores
One item per scored round (8 per session):
- `Title` <- Session ID
- `SessionDate` <- Session Date
- `Disipline` <- Discipline (SharePoint internal name contains the original spelling)
- `Walk_x002d_Back` <- Walk-Back
- `Round` <- Round
- `_x0033_mScore` ... `_x0037_mScore` <- 3m ... 7m scores

### Road to 75 Session Context
One item per session:
- `Title` <- Session ID
- `SessionDate` <- Session Date
- `Disipline` <- Discipline
- `Energy`
- `Focus`
- `PhysicalSetup`
- `DistractionLevel`
- `Notes`
- `Achivements` <- Achievements (SharePoint internal name contains the original spelling)

## Important

This is a browser/PWA client. Do not add an Entra client secret. The client ID and tenant ID are public SPA identifiers, not secrets.

The app always saves locally first. If Microsoft sign-in or Graph is unavailable, the session remains available on the device and can be retried from Saved Sessions.


## v0.2.1
- Date-only sync now sends `YYYY-MM-DD` directly to Microsoft Lists to prevent timezone date shifts.
- Microsoft Lists display labels may be renamed to Discipline and Achievements; the app intentionally continues using the original stable SharePoint internal names `Disipline` and `Achivements`.
