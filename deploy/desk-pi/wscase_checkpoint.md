# Checkpoint: Waveshare 7″ desk case (3D print)

Status: **Panel confirmed** — Waveshare **7inch HDMI LCD (C)**, SKU **11199**. Case **modeled in OpenSCAD, not printed yet**.

Use for PETG cases on all four desks (+ spare).

---

## Source of truth (CAD)

| Path | Role |
|------|------|
| **[`wscase/wscase.scad`](./wscase/wscase.scad)** | **Parametric model** — edit + iterate here |
| [`wscase/README.md`](./wscase/README.md) | OpenSCAD preview / STL export |
| [`wscase-ref/`](./wscase-ref/) | Panel STP, Exterior-Size, concept images |

**Preview:** open `wscase.scad` in OpenSCAD → **F5**.  
**Export:** Customizer `part = "case"` → **F6** → Export STL.

---

## Your panel (confirmed)

| Field | Value |
|-------|--------|
| Product | **7inch HDMI LCD (C)** |
| Waveshare SKU | **11199** |
| Part / distributor | **WS11199** |
| Resolution | 1024×600 IPS |
| Touch | Capacitive (USB) — **leave touch USB unplugged** for exhibition |
| Batch example | `260701WS11199` (date/batch prefix; product is still 11199) |

Product page: [waveshare.com — 7inch HDMI LCD (C)](https://www.waveshare.com/product/raspberry-pi/7inch-hdmi-lcd-c.htm)

---

## Official mechanical resources

| Resource | What it is | URL / path |
|----------|------------|------------|
| Wiki | Specs + links | [7inch HDMI LCD (C)](https://www.waveshare.com/wiki/7inch_HDMI_LCD_%28C%29) |
| **Exterior size photo** | Full PCB + **corner screw tabs**, labeled mm | [Exterior-Size.jpg](https://www.waveshare.com/img/devkit/LCD/7CP/Exterior-Size.jpg) · `wscase-ref/Exterior-Size.jpg` |
| Panel dimension PDF | **LCM glass only** — no tabs | [panel-dimension.pdf](https://files.waveshare.com/upload/3/33/7inch-hdmi-lcd-c-panel-dimension.pdf) |
| **CAD ZIP (B/C)** | STEP / Creo | [7inch_cad.zip](https://files.waveshare.com/upload/f/f4/7inch_cad.zip) |
| Local STEP | C module | `wscase-ref/7inch-HDMI-LCD-C-1118.stp` |

Wiki **164.90 × 106.96 × 8** = glass/LCM only. Full board with tabs ≈ **164.90 × 124.27**. Always verify on your physical panel.

---

## Design (locked — matches `wscase.scad`)

One-piece **open skirt** + **tilted roof**. No floor. No separate lid. No panel pocket.

- **Skirt:** hollow walls, open top and bottom; desk is the floor. Pi 4 sits on the desk inside.
- **Roof:** thin plate at **15°** (front low, back tall). Display **window** + **4× M3** holes. Panel screws **flat to the underside** of the roof (from below through the open skirt).
- **Sides/back:** closed — no exterior port holes.
- **Cables:** through a **hole in the desk** under the skirt (Ethernet, Pi USB-C, panel 5 V, GPIO).
- **HDMI / panel 5 V:** on the **right** edge of the panel (viewer’s right); extra cavity on that side (`panel_shift_x = -12`).
- **Desk fix:** four small **corner pads** (~18×18 mm), M4 from **under the desk up** into the pads. Not a flange rim / not a floor.
- **Rounding:** outer corners via 2D rounded footprint + roof clip to slope (`edge_r = 4`). Mount faces and holes stay flat/sharp.

**Concept refs:** `wscase-ref/wscase-concept-front.png`, `wscase-ref/wscase-corner-pad-explain.png` (M4 pad idea). Cutaway images are illustration-only.

---

## Parameters in `wscase.scad` (current)

| Parameter | Value | Notes |
|-----------|-------|--------|
| `outer_w` | **220** | Wider for right-side HDMI/5V |
| `outer_d` | **148** | Shorter face → smaller chin under screen |
| `wall` | **2.4** | |
| `front_h` | **28** | Back height ≈ 28 + 148·tan(15°) ≈ **68** |
| `slope_deg` | **15** | |
| `panel_w` / `panel_h` | **164.90 / 124.27** | Outer tab-to-tab envelope |
| `panel_pcb_w` / `panel_lcm_h` | **156.90 / 106.96** | Main PCB body (Exterior-Size) |
| `panel_aa_w` / `panel_aa_h` | **154.21 / 85.92** | Active area |
| `hole_spacing_x` / `y` | **148.90 / 114.96** | M3 centres (Exterior-Size dim lines) |
| `hole_inset_x` / `y` | **8.0 / 4.655** | Screw centres from outer BL corner |
| `aa_inset_x` / `y` | **5.345 / 19.175** | AA from outer BL corner |
| `hole_d` | **3.3** | M3 clearance |
| `panel_shift_x` | **-12** | More cavity on **right** |
| `panel_shift_y` | **6** | Slight back bias |
| `roof_t` | **3.0** | |
| `edge_r` | **4** | Outer rounding; `0` = sharp |
| `pad_w` / `pad_t` | **18 / 3.5** | Corner desk pads |
| `desk_hole_d` | **4.5** | M4 through |

---

## Fixing to the desk

| Feature | Spec |
|---------|------|
| Method | M4 **from under desk up** into corner pads |
| Pads | 4× ~18×18 mm at footprint corners |
| Countersink | Underside of pad |
| Cables | Desk hole under open skirt |
| Fallback | VHB under pads if no underside access |

**Screen M3:** from inside the skirt, up through panel tabs into the roof — reachable because the bottom is open.

---

## OpenSCAD workflow

1. Install OpenSCAD (`brew install --cask openscad` → app **OpenSCAD-2021.01**).
2. Open `deploy/desk-pi/wscase/wscase.scad`.
3. **F5** preview; tweak Customizer (`outer_w`, `panel_shift_*`, `edge_r`, …).
4. Calipers-check panel hole centres vs `hole_spacing_*` before printing.
5. `part = "case"` → **F6** → Export STL.
6. Print **PETG**, flange/pads down; trial-fit panel + Pi; mount with underside M4.

---

## Print settings (starting point)

- Material: **PETG**
- Layer: ~0.2 mm
- Perimeters: ≥3
- Panel: M3 through Waveshare corner tabs into roof
- Desk: M4 through corner pads from below

---

## Exhibition desk integration

- Pi 4 inside skirt (HDMI → Pi **HDMI0**; Waveshare HDMI on **right**)
- Panel 5 V from wall (not Pi USB); **no touch USB**
- GPIO mic PTT → **BCM17 + GND** (`checkpoint_mic.md`)
- Ethernet preferred
- Through-desk cables; case fixed with underside M4
- Kiosk: `http://MINI_IP:3847/desk/N`

---

## Done when

- [x] OpenSCAD model in repo (`wscase/wscase.scad`)
- [ ] M3 hole centres verified on physical panel  
- [ ] STL exported; PETG test print  
- [ ] Panel screws flush to roof; right-side HDMI/5V clearance OK  
- [ ] Desk hole + underside M4 (or VHB) tested  
- [ ] Pi + kiosk + cables through desk  
- [ ] Clone for desks 2–4  

---

## Related

- `deploy/desk-pi/checkpoint_mic.md` — mic PTT  
- `INVENTORY.md` — Waveshare ×4+1, PETG, hardware  
- `deploy/desk-pi/setup-kiosk.sh` — kiosk  
