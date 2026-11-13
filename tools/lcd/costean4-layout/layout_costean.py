# Costean OS label layout for NexusL1 (LVGL v8 align: 7 LEFT_MID, 8 RIGHT_MID, 9 CENTER; x/y relative to that anchor).
# Each value must fit the ORIGINAL instruction encoding (movi.n: -32..95, movi: -2048..2047) - patcher refuses otherwise.
LEFT, RIGHT, CENTER = 7, 8, 9
LAYOUT = {
 # 1/4 HASHRATE (MiningScreen)
 'lbHashrate':       (-81, 18, CENTER),   # gauge centre (79,103), D28 white
 'lbTemp':           (-103, -22, RIGHT),  # ASIC TEMP tile, right edge 217, centre y 64
 'lbRPM':            (22, -7, CENTER),    # ASIC TEMP tile 2nd line, centre (182,80)
 'lbPower':          (245, -22, LEFT),    # POWER tile
 'lbIntensidad':     (245, -7, LEFT),     # POWER tile 2nd line
 'lbVcore':          (164, 32, LEFT),     # CORE / INPUT tile
 'lbVinput':         (164, 47, LEFT),     # CORE / INPUT tile 2nd line
 'lbEficiency':      (245, 30, LEFT),     # EFFICIENCY tile (D16)
 'lbBestDifficulty': (-8, 47, RIGHT),    # EFFICIENCY tile 2nd line "BEST", right edge 310
 'lbASIC':           (18, 71, LEFT),      # bottom bar  "BM1491 x6"
 'lbTime':           (116, 71, LEFT),     # bottom bar  "UP ..."
 'lbIP':             (-10, 76, RIGHT),    # bottom bar right, under "IP ADDRESS"
 # 2/4 TUNING & POOL (SettingsScreen)
 'lbFreqSet':        (10, -21, LEFT),
 'lbVcoreSet':       (-10, -21, CENTER),  # centre x 150
 'lbFanSet':         (-12, -21, RIGHT),   # right edge 308
 'lbHashrateSet':    (8, 26, LEFT),        # HASHRATE card 4..160
 'lbShares':         (51, 26, CENTER),    # A/R card 164..250, centre x 207
 'lbBestDifficultySet': (-8, 26, RIGHT),
 'lbPoolNr':         (42, 62, LEFT),
 'lbPoolSet':        (56, 62, LEFT),
 'lbPortSet':        (44, 75, LEFT),
 'lbIPSet':          (-10, 75, RIGHT),
 # boot 'Connecting...' / 'Connected!' / 'Connect Failed!' (Splash2) and wifi portal SSID, as the Costean plain cards
 'lbConnect':        (110, 27, LEFT),     # under the wordmark, centre y 112
 'lbSSID':           (24, -15, LEFT),     # under '1. JOIN THIS HOTSPOT:', centre y 70
 # 3/4 MARKET (BTCScreen, LTC/USD)
 'lblBTCPrice':      (12, -10, LEFT),
 'lblHashPrice':     (-170, 40, RIGHT),
 'lblTempPrice':     (-12, 40, RIGHT),
 # 4/4 BLOCKS & NETWORK (GlobalStats)
 'lblBlock':         (10, -18, LEFT),
 'lblDifficulty':    (132, -18, LEFT),
 'lblGlobalHash':    (228, -18, LEFT),
 'lblBlocksToHalving': (10, 34, LEFT),
 'lblHalvingPercent':  (-10, 34, RIGHT),
 'lbllowFee':        (2, 71, CENTER),
 'lblmedFee':        (62, 71, CENTER),
 'lblhighFee':       (130, 71, CENTER),
}
# text colour registers: black (movi.n aR,0) -> white (movi.n aR,-1 = 0xFFFF) so the stock black labels read on navy cards
COLOURS = {'mining': -1, 'settings': -1, 'btc': -1, 'global': -1}
# literal-pool colour words: lbTime #DEEE00 (yellow) -> Costean C_MUTE #8D98CC (RGB565 0x8CD9, stored byte-swapped 0xD98C)
LITERALS = {'lbTime': 0xD98C}
