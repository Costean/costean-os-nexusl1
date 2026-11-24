# Costean OS for the BitLuck Nexus L1, v1.0.4.4-costean.9 (experimental)

Web UI release. The app (firmware + LCD) is byte for byte the costean.8 app; only `www.bin` changed.

- **Copper "Lode" theme** for the whole web UI (same palette as Costean OS on the NerdOctAxe).
- **Profiles** (new page): Eco / Stock / Turbo, taken from the firmware's own values: eco 1100 MHz / 1200 mV, stock 1300 / 1300, Turbo one firmware frequency step above stock (1350 / 1350), capped at +50 MHz / +50 mV and the firmware limits. The active profile is worked out from the applied frequency and voltage. Turbo asks you to type `ABOVE STOCK`.
- **Schedules** (new tab): switch profile and the LCD auto screen-off at set times and days.
  - *Schedules run from this page; keep a browser tab open on an always-on device. The miner itself can't run them.* The stock firmware has no scheduler or time zone, and no extra hardware or helper program is needed.
  - Up to 8 windows (overnight and all-day allowed), a base profile/screen for outside the windows, week view, next action, a log of applied changes, and JSON export / import.
  - Time zone of your choice (default America/New_York), DST-aware. The lowest-power profile wins overlaps. Values are checked against the firmware limits before every write, and a schedule that uses Turbo needs `ABOVE STOCK` when saved.
  - The schedule, log and history live in the browser (per miner). Screen control is the firmware's one switch, auto screen-off; the LCD has no dim setting.
- **History** (new page): the miner's own last 3 hours, plus 15-minute averages kept in the browser for 30 days. CSV export.
- **Dashboard**: a summary strip (profile, health score, pool ping / loss, efficiency, next schedule change, uptime) and a health & insights panel (0–100 score: temperatures, VR, fan, input voltage, shares, pool ping / packet loss, hashrate stability). Board-level only; there are no per-chip readings.
- **Pools**: ping and packet loss per pool.
- **System & Network**: Ethernet DHCP / static IP for boards with a port (stock `/api/system/ethernet/config`, applies after restart).
- Command palette: `turbo`, `schedules`, `history`.
- Unchanged: stock BitLuck nexus.v1.0.4.4 mining code, stock defaults 1300 MHz / 1300 mV, 6x BM1491 LCD art, partition layout.
- **Install:** coming from costean.8, OTA-upload only `www.bin`. From older versions, upload `esp-miner-NexusL1.bin` and then `www.bin`. Over USB, flash the factory image at 0x0 (this resets settings).

| File | SHA-256 |
| --- | --- |
| `esp-miner-factory-NexusL1-v1.0.4.4-costean.9.bin` | `0e165859b1b739a1139611e315be9f315fcb7e9da5711d39850ce87f33bce28c` |
| `costean-nexusl1-factory-v1.0.4.4-costean.9.zip` | `ac423987d347956f4b483b16a3b08e51948f652dfdb066c31281e41cd8afd3aa` |
| `esp-miner-NexusL1.bin` | `1759564dd23eca150efb66917496180cdfcb71f333b47976eee48ed932bf9e44` |
| `www.bin` | `80f7f75695b569910155e56ed90d27679be904c776642e2fe0c4debd3b4974a5` |
