# Medspa Booking & SMS Concierge Landing Page

This repository powers the public landing page for the Medspa Booking & SMS Concierge platform. The site explains the service offering, SMS compliance practices, and provides contact information for prospective medspa partners.

## Local preview

```bash
python -m http.server 8000
```

Open http://localhost:8000 in your browser to preview changes before committing.

## Deployment

GitHub Pages serves the `main` branch. Push updates to publish them automatically at https://wolfman30.github.io/medspa-landing/.

## Ops dashboard (internal)

This site includes an internal operational dashboard at `dashboard.html` that visualizes:

- Missed-call lead volume + paid-deposit conversion (by day)
- LLM latency distribution + p90/p95

**Requirements**

- A valid admin JWT for the API (`Authorization: Bearer ...`)
- API CORS allowlist that includes the dashboard origin (set `CORS_ALLOWED_ORIGINS` on the API, comma-separated)
