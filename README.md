# Public holiday uploads

Holiday records are managed manually. The backend does not fetch holiday data from external APIs.

## Configure upload access

Set `HOLIDAY_UPLOAD_TOKEN` in the backend environment to a private random value of at least 32 characters. Do not put the token in the mobile app or commit a real token. For local development, copy `.env.example` to `.env` and set the variable there. Configure the same variable as a secret in the backend deployment environment.

The upload endpoint requires this header:

```text
Authorization: Bearer <HOLIDAY_UPLOAD_TOKEN>
```

## Upload or replace a country/year

Send a `PUT` request to `/api/holidays` with `Content-Type: application/json`. An upload replaces the entire holiday list for that country and year.

```json
{
  "countryCode": "IN",
  "countryName": "India",
  "year": 2026,
  "holidays": [
    {
      "date": "2026-01-26",
      "name": "Republic Day",
      "localName": "Republic Day"
    },
    {
      "date": "2026-03-04",
      "name": "Example Regional Festival",
      "counties": ["IN-MH"]
    }
  ]
}
```

Required top-level fields are `countryCode` (two-letter code), `countryName`, `year`, and `holidays`. Each holiday requires an ISO date (`YYYY-MM-DD`) within that year and a `name`. `localName` defaults to `name`. Omit `counties` for a country-wide holiday; include one or more region codes to limit a holiday to those regions. Regional codes use `<countryCode>-<region>` format, for example `IN-MH` for Maharashtra. `fixed` and `launchYear` are optional. Holiday type metadata is not used or required.

Example using PowerShell:

```powershell
$headers = @{ Authorization = "Bearer $env:HOLIDAY_UPLOAD_TOKEN" }
Invoke-RestMethod `
  -Method Put `
  -Uri "https://<your-backend>/api/holidays" `
  -Headers $headers `
  -ContentType "application/json" `
  -InFile ".\holidays-IN-2026.json"
```

Example using `curl`:

```sh
curl -X PUT "https://<your-backend>/api/holidays" \
  -H "Authorization: Bearer <HOLIDAY_UPLOAD_TOKEN>" \
  -H "Content-Type: application/json" \
  --data-binary "@holidays-IN-2026.json"
```

A successful upload returns the country, year, and number of saved entries. The app reads the uploaded countries from `GET /api/holidays/countries`, holidays from `GET /api/holidays/:year/:countryCode`, and available region codes from `GET /api/holidays/regions/:countryCode`. Region codes are collected from `counties` across uploaded years for that country and appear in the settings dropdown as codes (for example, `IN-CA`). The dropdown always offers `All regions`. A country appears in the app after its first year is uploaded.
