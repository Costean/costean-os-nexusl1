// Validate an image before upload. Firmware: ESP image magic 0xE9, app descriptor version at 0x30, <= 4 MB OTA slot,
// and it must be built for the NexusL1 board (ASCII "NexusL1 board" present). www.bin: raw SPIFFS image (no 0xE9), <= 3 MB.
export async function inspectImage(file, kind) {
  const head = new Uint8Array(await file.slice(0, 256).arrayBuffer());
  if (kind === 'firmware') {
    if (head[0] !== 0xE9) return { ok: false, why: 'Not an ESP32 app image (missing 0xE9 magic). Did you pick www.bin or a factory image?' };
    if (file.size > 4 * 1024 * 1024) return { ok: false, why: 'Larger than the 4 MB OTA partition (factory images must be USB-flashed instead).' };
    const v = new TextDecoder().decode(head.slice(48, 80)).replace(/\0.*$/s, '');
    const txt = new TextDecoder('latin1').decode(new Uint8Array(await file.arrayBuffer()));
    const l1 = txt.includes('NexusL1 board initialized');
    return { ok: true, version: v, warn: l1 ? '' : 'This image does not look like NexusL1 firmware (other Nexus model?)' };
  }
  if (head[0] === 0xE9) return { ok: false, why: 'This looks like a firmware app image, not www.bin.' };
  if (file.size > 3 * 1024 * 1024) return { ok: false, why: 'Larger than the 3 MB www partition.' };
  return { ok: true };
}
