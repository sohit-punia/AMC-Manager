# AMC Manager

AMC Manager is a Windows desktop application for managing AMC (Annual Maintenance Contract) records, company information, AMC schedules, documents, remarks, and upcoming maintenance visits.

Built with React, Vite, Electron, Express, and SQLite.

## Features

- Dashboard for AMC overview
- Add new AMC records
- Edit existing records
- Delete records
- View complete record details
- Search records by project/order number
- Track Running AMC
- Track Upcoming AMC
- Track Due Soon AMC
- Track Missed AMC
- Automatic Next AMC Date calculation
- Automatic AMC Left calculation
- Quarterly AMC support
- Half Yearly AMC support
- Yearly AMC support
- Upload multiple documents
- Open attached documents with the default Windows application
- Local SQLite database
- Local document storage
- Windows desktop application
- Windows installer using Electron Builder

## AMC Calculation

The application automatically calculates the next AMC visit from the AMC type and the last AMC date.

### Quarterly

```text
Last AMC Date: 10-07-2026
Next AMC Date: 10-10-2026
