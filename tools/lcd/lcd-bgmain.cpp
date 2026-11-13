// Costean OS look for NexusL1: renders the STATIC page backgrounds with LVGL 8.3 using the same drawing
// primitives, palette and fonts as the Costean OS NerdOctAxe LCD (ui_octa.cpp). Live values are NOT drawn here: the stock
// NexusL1 firmware draws them with its own labels (positions patched to land inside these cards).
#include "displays/ui.h"
#include <cstdio>
#include <cstring>
#include <cmath>
LV_FONT_DECLARE(ui_font_vt323_21); LV_FONT_DECLARE(ui_font_vt323_35);
static const uint32_t C_BG = 0x070B1C, C_CARD = 0x10173A, C_CARD2 = 0x0C1230, C_LINE = 0x2E3B78, C_LINE2 = 0x46549E,
    C_TEXT = 0xEAF0FF, C_MUTE = 0x8D98CC, C_CYAN = 0x4FE3FF, C_BLUE = 0x5B8CFF, C_EBLUE = 0x2F7BFF, C_ICE = 0x8CD6FF,
    C_GREEN = 0x5CF2A6, C_AMBER = 0xFFC75A, C_GOLD = 0xFFD66B;
static const lv_font_t *F_S = &lv_font_montserrat_10, *F_M = &ui_font_vt323_21, *F_L = &ui_font_vt323_35;
static lv_color_t C(uint32_t c) { return lv_color_hex(c); }
static uint16_t fb[320 * 170];
static void flush(lv_disp_drv_t *d, const lv_area_t *a, lv_color_t *c) {
  for (int y = a->y1; y <= a->y2; y++) for (int x = a->x1; x <= a->x2; x++) fb[y * 320 + x] = (c++)->full;
  lv_disp_flush_ready(d);
}
static int OX = 0, OY = 0; static FILE *lg;
static void rect(lv_draw_ctx_t *dc, int x, int y, int w, int h, uint32_t col, lv_opa_t opa = 255, int rad = 0) {
  lv_draw_rect_dsc_t d; lv_draw_rect_dsc_init(&d); d.bg_color = C(col); d.bg_opa = opa; d.radius = rad;
  lv_area_t a = {(lv_coord_t)(OX + x), (lv_coord_t)(OY + y), (lv_coord_t)(OX + x + w - 1), (lv_coord_t)(OY + y + h - 1)}; lv_draw_rect(dc, &d, &a);
}
static void card(lv_draw_ctx_t *dc, int x, int y, int w, int h, uint32_t accent = C_LINE2, uint32_t fill = C_CARD) {
  if (lg) fprintf(lg, "C %d %d %d %d\n", x, y, x + w - 1, y + h - 1);
  lv_draw_rect_dsc_t d; lv_draw_rect_dsc_init(&d); d.bg_color = C(fill); d.bg_opa = 255; d.radius = 5;
  d.border_color = C(C_LINE); d.border_width = 1; d.border_opa = 255;
  lv_area_t a = {(lv_coord_t)(OX + x), (lv_coord_t)(OY + y), (lv_coord_t)(OX + x + w - 1), (lv_coord_t)(OY + y + h - 1)}; lv_draw_rect(dc, &d, &a);
  rect(dc, x + 5, y, 16, 2, accent);
}
static void line(lv_draw_ctx_t *dc, float x1, float y1, float x2, float y2, int w, uint32_t col) {
  lv_draw_line_dsc_t d; lv_draw_line_dsc_init(&d); d.color = C(col); d.width = w; d.round_start = d.round_end = 1;
  lv_point_t a = {(lv_coord_t)lroundf(OX + x1), (lv_coord_t)lroundf(OY + y1)}, b = {(lv_coord_t)lroundf(OX + x2), (lv_coord_t)lroundf(OY + y2)}; lv_draw_line(dc, &d, &a, &b);
}
static void arc(lv_draw_ctx_t *dc, int cx, int cy, int r, int w, int a0, int a1, uint32_t col) {
  lv_draw_arc_dsc_t d; lv_draw_arc_dsc_init(&d); d.color = C(col); d.width = w;
  lv_point_t c = {(lv_coord_t)(OX + cx), (lv_coord_t)(OY + cy)};
  a0 = (a0 % 360 + 360) % 360; a1 = (a1 % 360 + 360) % 360; if (a0 == a1) a1 = (a1 + 1) % 360; lv_draw_arc(dc, &d, &c, r, a0, a1);
}
static int tw(const lv_font_t *f, const char *s) { lv_point_t sz; lv_txt_get_size(&sz, s, f, 0, 0, LV_COORD_MAX, LV_TEXT_FLAG_NONE); return sz.x; }
static void text(lv_draw_ctx_t *dc, int x, int y, const char *s, const lv_font_t *f, uint32_t col, int al = 0, int w = 0) {
  lv_draw_label_dsc_t d; lv_draw_label_dsc_init(&d); d.color = C(col); d.font = f; int W = tw(f, s);
  int xx = al == 0 ? x : al == 1 ? x + (w - W) / 2 : x - W;
  lv_area_t a = {(lv_coord_t)(OX + xx), (lv_coord_t)(OY + y), (lv_coord_t)(OX + xx + W + 1), (lv_coord_t)(OY + y + lv_font_get_line_height(f))}; lv_draw_label(dc, &d, &a, s, NULL);
  if (lg) fprintf(lg, "T %d %d %d %d %s\n", a.x1, a.y1, a.x1 + W - 1, a.y2 - 1, s);
}
static void logoMark(lv_draw_ctx_t *dc, int x, int y) {
  rect(dc, x, y, 14, 14, C_EBLUE, 255, 2); rect(dc, x + 2, y + 2, 10, 10, C_BG);
  rect(dc, x + 5, y + 2, 7, 7, C_CYAN, 255, 1); rect(dc, x + 7, y + 4, 3, 3, C_BG);
}
static void wordmark(lv_draw_ctx_t *dc, int x, int y, const lv_font_t *f, int gap = 8) {
  text(dc, x, y, "COSTEAN", f, C_TEXT); text(dc, x + tw(f, "COSTEAN") + gap, y, "OS", f, C_EBLUE);
}
static int wordmarkW(const lv_font_t *f, int gap = 8) { return tw(f, "COSTEAN") + gap + tw(f, "OS"); }
// NexusL1 v1.0.4.4 stock profile, verified in the app image (board ctor: movi a8,1300 -> asicfrequency & asicvoltage defaults)
static const char *MODE = "STOCK";
static void header(lv_draw_ctx_t *dc, int page) {
  logoMark(dc, 6, 4); const int gap = 8;
  wordmark(dc, 25, -2, F_M, gap);
  text(dc, 7, 20, "STOCK | 1300 MHz | 1300 mV", F_S, C_MUTE);
  char b[48];
  if (page > 0) snprintf(b, sizeof b, "%d/4 %s MODE", page, MODE); else snprintf(b, sizeof b, page == 0 ? "BOOT" : "SETUP");
  int w = tw(F_S, b) + 20, x = 314 - w;
  card(dc, x, 5, w, 19, C_EBLUE, C_CARD2); text(dc, x + 8, 9, b, F_S, C_TEXT);
  rect(dc, x + w - 8, 12, 4, 4, page > 0 ? C_GREEN : C_AMBER, 255, 2);
  rect(dc, 6, 33, 308, 1, C_LINE);
}
static void dot(lv_draw_ctx_t *dc, int x, int y, uint32_t c) { rect(dc, x, y, 5, 5, c, 255, 2); }
static void bigLogo(lv_draw_ctx_t *dc, int x, int y) {   // Costean splash logo ring, frozen at the boot frame (k = 0)
  arc(dc, x + 35, y + 35, 32, 4, 0, 359, C_LINE); arc(dc, x + 35, y + 35, 32, 4, 0, 90, C_CYAN); arc(dc, x + 35, y + 35, 32, 4, 180, 230, C_EBLUE);
  rect(dc, x + 21, y + 21, 28, 28, C_EBLUE, 255, 3); rect(dc, x + 25, y + 25, 20, 20, C_BG);
  rect(dc, x + 31, y + 25, 14, 14, C_CYAN, 255, 2); rect(dc, x + 35, y + 29, 6, 6, C_BG);
}

// ---- page backgrounds (live NexusL1 labels land on the marked spots) ----
static void p_mining(lv_draw_ctx_t *dc) {            // 1/4 HASHRATE  (stock MiningScreen)
  header(dc, 1);
  card(dc, 4, 37, 150, 104, C_EBLUE);
  text(dc, 4, 40, "MEASURED HASHRATE", F_S, C_MUTE, 1, 150);
  const int cx = 79, cy = 103, R = 52;
  arc(dc, cx, cy, R, 6, 135, 45, C_LINE);
  for (int i = 0; i <= 18; i++) {                    // static bezel: ticks + two-tone ring (decorative, not a live fill)
    float a = (135 + i * 15) * (float)M_PI / 180;
    line(dc, cx + (R + 3) * cosf(a), cy + (R + 3) * sinf(a), cx + (R + 1) * cosf(a), cy + (R + 1) * sinf(a), 1, i < 12 ? C_LINE2 : C_CYAN);
  }
  arc(dc, cx, cy, R, 2, 135, 315, C_EBLUE); arc(dc, cx, cy, R, 2, 315, 45, C_CYAN);
  text(dc, cx - 60, 121, "MH/s", F_S, C_TEXT, 1, 120);         // under the hashrate label (centre 79,103)
  text(dc, cx - 60, 131, "SCRYPT", F_S, C_MUTE, 1, 120);
  const int X0 = 158, W = 77, H = 50, G = 4;
  const char *cap[4] = {"ASIC TEMP", "POWER", "CORE / INPUT", "EFF  J/GH"};
  uint32_t acc[4] = {C_EBLUE, C_EBLUE, C_BLUE, C_EBLUE};
  for (int i = 0; i < 4; i++) { int x = X0 + (i % 2) * (W + G), y = 37 + (i / 2) * (H + G); card(dc, x, y, W, H, acc[i]); text(dc, x + 6, y + 4, cap[i], F_S, C_MUTE); }
  text(dc, 220, 58, "C", F_S, C_MUTE);                          // lbTemp right edge 217
  text(dc, 204, 73, "RPM", F_S, C_MUTE);                        // lbRPM centred at 182
  text(dc, 242, 127, "BEST", F_S, C_MUTE);                      // lbBestDifficulty right edge 310
  card(dc, 4, 145, 312, 23, C_CYAN, C_CARD2);
  dot(dc, 10, 154, C_GREEN);
  text(dc, 74, 151, "x4", F_S, C_MUTE);                         // after lbASIC (BM1491)
  text(dc, 98, 151, "UP", F_S, C_MUTE);                         // before lbTime (x 116)
  text(dc, 310, 146, "IP ADDRESS", F_S, C_MUTE, 2);             // lbIP right-aligned below
}
static void p_settings(lv_draw_ctx_t *dc) {          // 2/4 TUNING & POOL  (stock SettingsScreen)
  header(dc, 2);
  card(dc, 4, 37, 101, 48, C_CYAN);  text(dc, 10, 41, "ASIC CLOCK", F_S, C_MUTE);  text(dc, 48, 59, "MHz", F_S, C_MUTE);
  text(dc, 99, 72, "STOCK 1300", F_S, C_GREEN, 2);
  card(dc, 109, 37, 101, 48, C_EBLUE); text(dc, 115, 41, "CORE VOLT SET", F_S, C_MUTE); text(dc, 168, 59, "mV", F_S, C_MUTE);
  text(dc, 204, 72, "STOCK 1300", F_S, C_GREEN, 2);
  card(dc, 214, 37, 102, 48, C_BLUE); text(dc, 220, 41, "FAN MODE", F_S, C_MUTE);
  card(dc, 4, 89, 156, 44, C_EBLUE); text(dc, 154, 93, "HASHRATE", F_S, C_MUTE, 2); text(dc, 154, 119, "MH/s", F_S, C_TEXT, 2);
  card(dc, 164, 89, 94, 44, C_GREEN); text(dc, 170, 93, "A / R SHARES", F_S, C_MUTE);
  card(dc, 262, 89, 54, 44, C_ICE);  text(dc, 268, 93, "BEST", F_S, C_MUTE);
  card(dc, 4, 137, 312, 31, C_CYAN, C_CARD2);
  text(dc, 10, 141, "POOL", F_S, C_MUTE); text(dc, 10, 155, "PORT", F_S, C_MUTE); text(dc, 214, 155, "IP", F_S, C_MUTE);
}
static void p_price(lv_draw_ctx_t *dc) {             // 3/4 MARKET  (stock "BTC" price screen; NexusL1 shows LTC/USD)
  header(dc, 3);
  card(dc, 4, 37, 312, 68, C_ICE);
  text(dc, 10, 41, "LITECOIN PRICE", F_S, C_MUTE); text(dc, 310, 41, "LTC / USD", F_S, C_CYAN, 2);
  text(dc, 310, 91, "SOURCE: ALTERNATIVE.ME", F_S, C_MUTE, 2);
  card(dc, 4, 109, 154, 32, C_EBLUE); text(dc, 10, 113, "HASHRATE", F_S, C_MUTE); text(dc, 10, 126, "MH/s", F_S, C_TEXT);
  card(dc, 162, 109, 154, 32, C_EBLUE); text(dc, 168, 113, "ASIC TEMP", F_S, C_MUTE); text(dc, 168, 126, "C", F_S, C_TEXT);
  card(dc, 4, 145, 312, 23, C_CYAN, C_CARD2);
  dot(dc, 10, 154, C_GREEN); text(dc, 18, 150, "SCRYPT | LTC + DOGE MERGED", F_S, C_GREEN);
  text(dc, 310, 150, "NEXUS L1 | 4x BM1491", F_S, C_TEXT, 2);
}
static void p_global(lv_draw_ctx_t *dc) {            // 4/4 BLOCKS & NETWORK  (stock GlobalStats)
  header(dc, 4);
  card(dc, 4, 37, 118, 48, C_EBLUE);  text(dc, 10, 41, "BLOCK HEIGHT", F_S, C_MUTE);
  card(dc, 126, 37, 92, 48, C_BLUE);  text(dc, 132, 41, "NET DIFF", F_S, C_MUTE);
  card(dc, 222, 37, 94, 48, C_GREEN); text(dc, 228, 41, "NET HASH", F_S, C_MUTE); text(dc, 310, 41, "TH/s", F_S, C_MUTE, 2);
  card(dc, 4, 89, 312, 52, C_ICE);
  text(dc, 10, 93, "NEXT HALVING  BLOCKS TO GO", F_S, C_MUTE); text(dc, 310, 93, "EPOCH PROGRESS", F_S, C_MUTE, 2);
  card(dc, 4, 145, 312, 23, C_CYAN, C_CARD2);
  text(dc, 10, 151, "FEES lit/vB", F_S, C_MUTE);
  text(dc, 146, 151, "LOW", F_S, C_MUTE, 2); text(dc, 206, 151, "MED", F_S, C_MUTE, 2); text(dc, 272, 151, "HIGH", F_S, C_MUTE, 2);
}
static void p_splash1(lv_draw_ctx_t *dc) {           // boot splash (Costean drawPlain mode 1)
  card(dc, 6, 6, 308, 158, C_EBLUE, C_CARD2); bigLogo(dc, 24, 46);
  const int tx = 110, gap = 14; wordmark(dc, tx, 40, F_L, gap);
  text(dc, tx, 84, "NEXUS L1 | 4x BM1491 | SCRYPT", F_S, C_MUTE);
  text(dc, tx, 100, "costean-nexusl1-1.0.4.4", F_S, C_BLUE);
  text(dc, tx, 116, "STOCK 1300 MHZ / 1300 MV", F_S, C_GREEN);
}
static void p_splash2(lv_draw_ctx_t *dc) {           // connecting (Costean drawPlain mode 4); lbConnect lands at x 110, centre y 112
  card(dc, 6, 6, 308, 158, C_EBLUE, C_CARD2); bigLogo(dc, 24, 46);
  const int tx = 110, gap = 14; wordmark(dc, tx, 58, F_L, gap);
}
static void p_portal(lv_draw_ctx_t *dc) {            // wifi portal (Costean drawPlain mode 2); lbSSID lands at x 24, centre y 70
  card(dc, 6, 6, 308, 158, C_EBLUE, C_CARD2);
  text(dc, 16, 14, "WIFI SETUP", F_M, C_TEXT);
  text(dc, 16, 44, "1. JOIN THIS HOTSPOT:", F_S, C_MUTE);
  text(dc, 16, 92, "2. OPEN THE SETUP PAGE THAT POPS UP", F_S, C_MUTE);
  text(dc, 16, 108, "   AND PICK YOUR WIFI NETWORK", F_S, C_MUTE);
  text(dc, 16, 140, "COULD NOT JOIN THE CONFIGURED WIFI", F_S, C_AMBER);
}
static void p_safe(lv_draw_ctx_t *dc) {             // power-off text image (267x42, drawn by the firmware on its black screen)
  rect(dc, 0, 0, 320, 170, 0x000000); text(dc, 0, 1, "SAFE TO POWER OFF", F_L, C_TEXT, 1, 267);
}
static void p_found(lv_draw_ctx_t *dc) {            // block-found overlay image 310x130 (Costean drawBurst look, static)
  rect(dc, 0, 0, 310, 130, C_BG);
  lv_draw_rect_dsc_t d; lv_draw_rect_dsc_init(&d); d.bg_opa = 0; d.radius = 8; d.border_color = C(C_GOLD); d.border_width = 3; d.border_opa = 255;
  lv_area_t r = {1, 1, 308, 128}; lv_draw_rect(dc, &d, &r);
  text(dc, 0, 14, "EVERY HASH IS A NEW CHANCE", F_S, C_MUTE, 1, 310);
  text(dc, 0, 36, "BLOCK FOUND!", F_L, C_GOLD, 1, 310);
  text(dc, 0, 76, "LTC + DOGE MERGED", F_M, C_TEXT, 1, 310);
  text(dc, 0, 106, "NEXUS L1 - 4X BM1491", F_S, C_CYAN, 1, 310);
}
typedef void (*pfn)(lv_draw_ctx_t *);
static pfn cur;
static void ev(lv_event_t *e) { lv_draw_ctx_t *dc = lv_event_get_draw_ctx(e); OX = OY = 0; rect(dc, 0, 0, 320, 170, C_BG); cur(dc); }
int main() {
  lv_init();
  static lv_color_t buf[320 * 170]; static lv_disp_draw_buf_t db; lv_disp_draw_buf_init(&db, buf, NULL, 320 * 170);
  static lv_disp_drv_t drv; lv_disp_drv_init(&drv); drv.hor_res = 320; drv.ver_res = 170; drv.flush_cb = flush; drv.draw_buf = &db; drv.full_refresh = 1; lv_disp_drv_register(&drv);
  lv_obj_t *s = lv_obj_create(NULL); lv_obj_remove_style_all(s); lv_disp_load_scr(s);
  lv_obj_t *o = lv_obj_create(s); lv_obj_remove_style_all(o); lv_obj_set_size(o, 320, 170); lv_obj_add_event_cb(o, ev, LV_EVENT_DRAW_MAIN, NULL);
  struct { const char *n; pfn f; } P[] = {{"miningscreen2", p_mining}, {"settingsscreen", p_settings}, {"btcscreen", p_price}, {"globalStats", p_global},
                                         {"initscreen2", p_splash1}, {"splashscreen2", p_splash2}, {"portalscreen", p_portal}, {"safe_full", p_safe}, {"found_full", p_found}};
  for (auto &p : P) {
    char ln[128]; snprintf(ln, sizeof ln, "bg/%s.boxes", p.n); lg = fopen(ln, "w");
    cur = p.f; lv_obj_invalidate(o); lv_refr_now(NULL); fclose(lg); lg = nullptr;
    char fn[128]; snprintf(fn, sizeof fn, "bg/%s.rgb565", p.n); FILE *f = fopen(fn, "wb"); fwrite(fb, 2, 320 * 170, f); fclose(f);
  }
  puts("bg ok"); return 0;
}
