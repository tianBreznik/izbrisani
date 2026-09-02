# Show open / close (after automation installed)

## Open

1. Power **router** → wait until Wi‑Fi is up (~30 s)
2. Power **show PDU** (Mac Mini, 4 desk Pis, panels, ESP32, Shelly)
3. Wait **2 minutes**
4. Kodak **front switch → ON** (leave on for the day)
5. **Test:** press Talk on desk 1 — all four screens show subtitles, speakers play
6. Open to public

## Close

1. Wait for last visitor monologue to finish (or Esc on control laptop)
2. Kodak **NO LIGHT** (or leave front ON if staff prefer — Shelly is off between carousels)
3. Power down PDU (optional: leave Mac Mini always on)

## If something looks wrong

| Symptom | Check |
|---------|--------|
| Black screens on Pis | `ssh desk-N` → `systemctl status desk-client@N` |
| No audio | SuperCollider running on Mac? USB interface connected? |
| Talk does nothing | `curl http://MAC_IP:3847/api/health` from a Pi |
| Séance lights dead | `ESP32_URL` in Mac `show.env.local` |

**Tech only:** `deploy/automation/mac/status.sh` on Mini, `deploy/automation/pi/status.sh` on Pis.

## Revert to manual lab mode

Mac: `deploy/automation/mac/uninstall.sh`  
Pi: `sudo deploy/automation/pi/uninstall.sh`

Then use `npm start` and foreground `desk_client.py` as before.
