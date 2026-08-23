# RiverWatch Android 2×2 Widget — Live Snapshot v14

## Data source

Apps Script Snapshot API:
`https://script.google.com/macros/s/AKfycbwUg8izBue1WMfsjVJbsxorK1LstpAfsqd_KgH6K06u-8w0bpMLXOzIG1o7Cb3BtN2ung/exec`

The API is the calculation SSoT for:
- D-Day
- ETA gap
- Voyage State
- Trend

The Android widget only renders the latest successful snapshot and maps State to the local approved Boat asset.

## Battery policy

- 10:00 local time: primary snapshot request.
- If the 10:00 request fails: one retry at 10:30.
- If 10:30 also fails: no more network requests that day; LAST_GOOD remains on screen.
- Success at 10:00 means no 10:30 request.
- AlarmManager `setWindow()` uses a 10-minute window so Android can batch wakeups for lower battery use; the fetch may occur a few minutes after the nominal time.
- No foreground service, location, sensor, continuous polling, or animation.
- After reboot, the next 10:00 schedule is restored.
- On first widget enable/install, one immediate fetch is performed so the widget does not have to wait until 10:00.

## Failure behavior

Snapshot values are stored in SharedPreferences. Network/API failure never clears the last successful values.

## Build

Open only the `widget/` folder in Android Studio, Sync, then Run/install to the connected Galaxy device.
