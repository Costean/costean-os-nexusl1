# Costean OS for the BitLuck Nexus L1, v1.0.4.4-costean.7 (experimental)

- **LCD artwork fixed:** the small leftover tag next to COSTEAN OS is removed, and the hash board text now reads **4x BM1491** everywhere (boot splash, mining page, price page and Block Found screen). Only the pixel data of the built-in LCD images changed. The program code and LCD layout are byte for byte the field-tested costean.4 app.
- **Web UI:** the Costean OS control center:
  - Dashboard with a 4x BM1491 hash board card
  - Mining & Tuning
  - 2 pools (Failover / Dual pool split)
  - Thermal & LCD
  - Block Found, Swarm
  - InfluxDB & Alerts (Discord webhook)
  - System & Network, Diagnostics
  - Update & Recovery (backup/restore, OTP)
  - Ctrl K command palette
  - One-time reload after a web UI update
- Stock BitLuck nexus.v1.0.4.4 mining code and stock 1300 MHz / 1300 mV defaults. Partition layout unchanged.
- **Install:** over OTA, upload **both** `esp-miner-NexusL1.bin` and `www.bin`. Over USB, flash the factory image at 0x0 (this resets settings).

| File | SHA-256 |
| --- | --- |
| `esp-miner-factory-NexusL1-v1.0.4.4-costean.7.bin` | `3884646baaa86d05080da5b667251534cc5de1f80ede305286f683c02df39ab9` |
| `costean-nexusl1-factory-v1.0.4.4-costean.7.zip` | `8c8a69e4482d564f6b806baddf36fb4aa0968b83f8ccbf565e1a2baa6d68bebd` |
| `esp-miner-NexusL1.bin` | `6b0d47af953bb57cf54224caf9d520add403b8ace494bdb1a3528c5e07fe6041` |
| `www.bin` | `f4abbd3615e60b67704a6863e979eeeb72e48b6d2e9f0c8232f11bd10113e1db` |
