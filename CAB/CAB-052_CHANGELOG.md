# CAB-052 CHANGELOG

- Mission: Days Since Action value now includes the `Days` unit.
- Split Google Sheet synchronization into Core Data and OpenSeaLogbook paths.
- Dashboard / Boatyard navigation refreshes Core Data; Logbook navigation refreshes Logbook only.
- Last Sync now advances only after a fully successful Core Data synchronization.
- Core refresh failure retains the Last Known Good application state.
- Intro now performs boot synchronization before bridge entry.
- ENTER BRIDGE is interlocked until Core + Logbook initial loads complete.
- Added compact intro boot-state monitor and full-page RETRY on boot sync failure.
