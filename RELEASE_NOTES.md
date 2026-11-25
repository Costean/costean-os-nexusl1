# Costean OS for the BitLuck Nexus L1, v1.0.4.4-costean.10 (experimental)

LCD colour release. The LCD now uses the same copper **Lode** colours as the web UI instead of the old blue.

- **LCD:** the 9 built-in screen images are redrawn from the same source (`tools/lcd/lcd-bgmain.cpp`) with only the palette swapped to the web UI's Lode colours:

  | Role | costean.9 (blue) | costean.10 (Lode) |
  | --- | --- | --- |
  | Screen background | `#070B1C` | `#0A0B0E` |
  | Card fill | `#10173A` | `#181B21` |
  | Splash / portal card | `#0C1230` | `#121418` |
  | Card border | `#2E3B78` | `#343842` |
  | Card accent (default) | `#46549E` | `#4A505C` |
  | Text | `#EAF0FF` | `#F3EDE4` |
  | Muted text | `#8D98CC` | `#8E939C` |
  | Accent (gauge, logo, accent bars) | `#4FE3FF` | `#EE8A4C` copper |
  | Accent 2 ("OS", bars) | `#2F7BFF` | `#D9733A` deep copper |
  | Secondary | `#5B8CFF` | `#3FD8C2` teal |
  | Ice | `#8CD6FF` | `#7FE6D6` |
  | OK / stock | `#5CF2A6` | `#86E39A` |
  | Warning | `#FFC75A` | `#FFB547` |
  | Block found gold | `#FFD66B` | `#F6CB6E` |

  The uptime text colour (one 32-bit colour constant, read only by that label) goes from `#8D98CC` to `#8E939C`. Same layout, sizes, positions and text as costean.9.
- **Unchanged:** stock BitLuck nexus.v1.0.4.4 mining, ASIC, power, fan and protection code; stock defaults 1300 MHz / 1300 mV; 6x BM1491; partition layout. The live values drawn by the firmware keep their own colours (white / light grey), and the red overheat box is drawn by the firmware.
- **Web UI:** unchanged apart from the version label (costean.10).
- **Install:** OTA-upload `esp-miner-NexusL1.bin`, wait for the reboot, then `www.bin`. Over USB, flash the factory image at 0x0 (this resets settings).

| File | SHA-256 |
| --- | --- |
| `esp-miner-factory-NexusL1-v1.0.4.4-costean.10.bin` | `5dd46a60f07a8d6fa16eab6e0cee17f7f6bdb87b439f425b9094a3b02ac4b73c` |
| `costean-nexusl1-factory-v1.0.4.4-costean.10.zip` | `21f10a9179daf09fbc15d6c0be4eeee4248861727c5e82a677f57659efd16056` |
| `esp-miner-NexusL1.bin` | `2481da17c30fe02515ddfc9348e3e5fffafc4c51dd85d4c4134c8bf2ad660db8` |
| `www.bin` | `b3c368928140ea983d2838e2b6e4e6443dc4bc85af69c7a02dbeddd0a4125296` |
