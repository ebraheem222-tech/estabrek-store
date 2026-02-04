# Railway Cron: Backfill Image Hashes

This project includes the script `npm run backfill:image-hashes`, which fills missing `imageHash` values.

## Recommended Cron Setup (Railway UI)
1. Open your Railway project → Service → **Scheduled Jobs**.
2. Add a new job:
   - **Command:** `npm run backfill:image-hashes`
   - **Schedule:** daily (or hourly if you upload many images)
3. Add env vars for the job:
   - `IMAGE_HASH_FETCH_REMOTE=1` (enable Cloudinary/remote hashing)
   - `IMAGE_HASH_BACKFILL_DELAY_MS=50` (reduce load)
   - `IMAGE_HASH_BACKFILL_LIMIT=500` (optional cap per run)

## One-Time Full Recompute
If you ever need to recompute everything:

```
IMAGE_HASH_FORCE=1 IMAGE_HASH_FETCH_REMOTE=1 npm run backfill:image-hashes
```

## Notes
- The script only fills missing hashes by default.
- If you have multiple app instances, using a Scheduled Job avoids duplicate work.
