// Waveshare 7" HDMI LCD (C) — open skirt + tilted roof
// Panel sits in underside pocket; M3 through roof. F5 | part="case" → F6 → STL

/* [Which part] */
part = "assembly"; // ["assembly", "case", "hole_gauge", "fit_check"]

/* [Case outer] */
outer_w = 230;          // room for HDMI bend on the right
outer_d = 148;
wall = 2.4;
// Sharp front tip (easy wedge print) — no blunt vertical face
front_h = 0;
slope_deg = 24.7;       // back ≈ 68 mm


/* [Panel — Exterior-Size.jpg Rev4.1, mm] */
panel_w = 164.90;       // outer tab-to-tab width
panel_h = 124.27;       // outer tab-to-tab height
panel_lcm_h = 106.96;   // main PCB / glass height (between tabs)
panel_pcb_w = 156.90;   // main PCB body width (between corner tabs)
panel_aa_w = 154.21;    // active area width
panel_aa_h = 85.92;     // active area height
panel_t = 8.0;

// Screw centres from Exterior-Size dimension lines (148.90 × 114.96)
// 156.90 is PCB body width — NOT hole spacing
hole_spacing_x = 148.90;
hole_spacing_y = 114.96;
hole_d = 3.3;

// Insets from outer envelope bottom-left (Exterior-Size.jpg)
hole_inset_x = (panel_w - hole_spacing_x) / 2;   // 8.0
hole_inset_y = (panel_h - hole_spacing_y) / 2;   // 4.655
aa_inset_x = (panel_w - panel_aa_w) / 2;         // 5.345
aa_inset_y = (panel_h - panel_lcm_h) / 2
           + (panel_lcm_h - panel_aa_h) / 2;      // 19.175

panel_shift_x = -18;    // more cavity on viewer’s RIGHT for HDMI + 5 V
panel_shift_y = 6;

/* [Roof] */
roof_t = 4.0;           // thick enough for pocket + screw land
pocket_d = 1.5;         // underside recess depth for panel PCB / tabs
pocket_clear = 0.4;     // extra mm around 164.90 × 124.27 envelope
window_inset = 1.0;

/* [Rounding] */
edge_r = 4;             // 0 = sharp

/* [Corner desk pads] */
pad_w = 18;
pad_t = 3.5;
pad_inset = 9;
pad_front_setback = 22; // keep pads off the knife tip (y=0)
desk_hole_d = 4.5;
countersink_d = 9;
countersink_h = 1.8;

/* [Preview] */
show_ghost_panel = true;
show_pcb_outline = true;   // yellow PCB edge — compare 4 mm to holes, NOT the blue glass
$fn = 48;

back_h = front_h + outer_d * tan(slope_deg);
win_w = panel_aa_w - 2 * window_inset;
win_h = panel_aa_h - 2 * window_inset;


pcb_x = (panel_w - panel_pcb_w) / 2;
pcb_y = (panel_h - panel_lcm_h) / 2;

// Panel envelope anchor on roof (bottom-left of nominal 164.90×124.27)
function panel_bl_x() = panel_shift_x - panel_w / 2;
function panel_bl_y() = panel_shift_y - panel_h / 2;

function hole_x(left) = panel_bl_x() + (left ? hole_inset_x : panel_w - hole_inset_x);
function hole_y(bottom) = panel_bl_y() + (bottom ? hole_inset_y : panel_h - hole_inset_y);

pocket_w = panel_w + 2 * pocket_clear;
pocket_h = panel_h + 2 * pocket_clear;

// ---------------------------------------------------------------------------
module rounded_rect(w, d, r) {
  if (r <= 0)
    square([w, d]);
  else
    offset(r = r)
      offset(delta = -r)
        square([w, d]);
}

// Everything on the +Z side of the outer roof plane (slope through front edge)
module above_roof_outer() {
  translate([outer_w / 2, 0, front_h])
    rotate([slope_deg, 0, 0])
      translate([-outer_w, -outer_d, 0])
        cube([outer_w * 2, outer_d * 3, 300]);
}

// Everything on the +Z side of the roof UNDERSIDE (parallel, roof_t below)
module above_roof_underside() {
  translate([outer_w / 2, outer_d / 2, front_h + (outer_d / 2) * tan(slope_deg)])
    rotate([slope_deg, 0, 0])
      translate([-outer_w * 2, -outer_d * 2, -roof_t])
        cube([outer_w * 4, outer_d * 4, 500]);
}

module on_roof() {
  translate([outer_w / 2, outer_d / 2, front_h + (outer_d / 2) * tan(slope_deg)])
    rotate([slope_deg, 0, 0])
      children();
}

// World Z of roof underside at case Y (vertical column, no heavy CSG clip)
function roof_underside_z(y) = y * tan(slope_deg) - roof_t / cos(slope_deg);

module desk_pad_hole(cx, cy) {
  // Through pad + skirt wall only — height stops 1 mm below roof underside
  hole_h = max(pad_t + 0.2, roof_underside_z(cy) - 1.0) + 0.1;
  translate([cx, cy, -0.1]) {
    cylinder(d = desk_hole_d, h = hole_h);
    cylinder(d1 = countersink_d, d2 = desk_hole_d, h = countersink_h);
  }
}

module one_piece_case() {
  // Pad Y positions: front pair set back from sharp tip
  pad_ys = [pad_front_setback, outer_d - pad_w];
  pad_xs = [0, outer_w - pad_w];

  function pad_hole_x(x) = x < pad_w ? x + pad_inset : x + pad_w - pad_inset;
  function pad_hole_y(y) =
    y <= pad_front_setback + 0.1 ? y + pad_inset : y + pad_w - pad_inset;

  // Single solid: outer shell + corner pads, then hollow/window/holes
  difference() {
    union() {
      difference() {
        linear_extrude(height = back_h + 5)
          rounded_rect(outer_w, outer_d, edge_r);
        above_roof_outer();
      }
      for (x = pad_xs, y = pad_ys)
        translate([x, y, 0])
          linear_extrude(height = pad_t)
            rounded_rect(pad_w, pad_w, min(edge_r, pad_w / 3));
    }

    // Hollow — leave pad footprints uncut
    difference() {
      translate([wall, wall, -1])
        linear_extrude(height = back_h + 10)
          rounded_rect(
            outer_w - 2 * wall,
            outer_d - 2 * wall,
            max(edge_r - wall, 0)
          );
      above_roof_underside();
      for (x = pad_xs, y = pad_ys)
        translate([x - 0.01, y - 0.01, -0.5])
          cube([pad_w + 0.02, pad_w + 0.02, pad_t + 0.55]);
    }

    // Panel pocket (underside) + window + M3 through remaining roof
    on_roof() {
      // Shallow recess for full tab envelope — panel drops in neatly
      translate([
        panel_bl_x() - pocket_clear,
        panel_bl_y() - pocket_clear,
        -roof_t - 0.05
      ])
        cube([pocket_w, pocket_h, pocket_d + 0.1]);

      // Viewing window through roof
      translate([panel_bl_x() + aa_inset_x + window_inset,
                 panel_bl_y() + aa_inset_y + window_inset,
                 -roof_t - 20])
        cube([win_w, win_h, roof_t + 40]);

      // M3 holes in pocket floor / through roof
      for (left = [true, false], bottom = [true, false])
        translate([hole_x(left), hole_y(bottom), -roof_t - 20])
          cylinder(d = hole_d, h = roof_t + 40);
    }

    // M4 desk holes — through pad + skirt wall, clipped below roof (never through panel)
    for (x = pad_xs, y = pad_ys)
      desk_pad_hole(pad_hole_x(x), pad_hole_y(y));
  }
}

module panel_silhouette_2d() {
  tab_w = 2 * hole_inset_x;
  tab_h = pcb_y;

  translate([pcb_x, pcb_y])
    square([panel_pcb_w, panel_lcm_h]);

  for (left = [true, false], bottom = [true, false]) {
    translate([
      (left ? hole_inset_x : panel_w - hole_inset_x) - tab_w / 2,
      bottom ? 0 : panel_h - tab_h
    ])
      square([tab_w, tab_h]);
  }
}

// Yellow PCB body outline — measure hole-to-THIS-edge (4 mm), not blue glass (14.5 mm)
module pcb_outline_on_roof(z = -roof_t + 0.05, h = 0.15) {
  if (show_pcb_outline)
    color([1, 0.85, 0.1, 0.95])
      on_roof()
        translate([panel_bl_x() + pcb_x, panel_bl_y() + pcb_y, z])
          cube([panel_pcb_w, panel_lcm_h, h]);
}

module ghost_panel() {
  blx = panel_bl_x();
  bly = panel_bl_y();
  // Panel PCB top face sits on pocket floor
  pz = -roof_t + pocket_d - panel_t;

  color([0.12, 0.35, 0.75, 0.85])
    on_roof()
      translate([blx, bly, pz])
        linear_extrude(height = panel_t)
          panel_silhouette_2d();

  pcb_outline_on_roof(z = -roof_t + pocket_d - 0.05, h = 0.2);

  color([0.55, 0.85, 1.0, 0.45])
    on_roof()
      translate([blx + aa_inset_x, bly + aa_inset_y, -roof_t + pocket_d - 0.15])
        cube([panel_aa_w, panel_aa_h, 0.3]);

  color([0.95, 0.95, 0.95, 1])
    on_roof()
      for (left = [true, false], bottom = [true, false])
        translate([hole_x(left), hole_y(bottom), pz - 0.1])
          cylinder(d = hole_d, h = panel_t + 0.3);
}

// Flat 1:1 check plate — print first, lay panel on it, verify all 4 M3 holes
module hole_gauge() {
  t = 1.2;
  margin = 2;
  plate_w = panel_w + 2 * margin;
  plate_h = panel_h + 2 * margin;

  difference() {
    // Same silhouette as Exterior-Size
    translate([margin, margin, 0])
      linear_extrude(height = t)
        panel_silhouette_2d();

    // Active area recess (visual only)
    translate([margin + aa_inset_x, margin + aa_inset_y, t - 0.35])
      cube([panel_aa_w, panel_aa_h, 0.5]);

    // M3 holes
    for (left = [true, false], bottom = [true, false])
      translate([
        margin + (left ? hole_inset_x : panel_w - hole_inset_x),
        margin + (bottom ? hole_inset_y : panel_h - hole_inset_y),
        -0.1
      ])
        cylinder(d = hole_d, h = t + 0.2);
  }
}

// Flat 1:1 — open beside Exterior-Size.jpg; measure yellow PCB edge → hole = 4 mm
module fit_check() {
  t = 2;
  tab_gap = (hole_spacing_y - panel_lcm_h) / 2;   // 4.0 mm PCB edge → hole (Exterior-Size)
  side_gap = (panel_pcb_w - hole_spacing_x) / 2;  // 4.0 mm

  color([0.12, 0.35, 0.75])
    linear_extrude(height = t)
      panel_silhouette_2d();

  color([1, 0.85, 0.1, 0.95])
    translate([pcb_x, pcb_y, t + 0.01])
      cube([panel_pcb_w, panel_lcm_h, 0.2]);

  color([0.55, 0.85, 1, 0.4])
    translate([aa_inset_x, aa_inset_y, t + 0.02])
      cube([panel_aa_w, panel_aa_h, 0.15]);

  color([0.9, 0.9, 0.9])
    for (left = [true, false], bottom = [true, false])
      translate([
        left ? hole_inset_x : panel_w - hole_inset_x,
        bottom ? hole_inset_y : panel_h - hole_inset_y,
        -0.1
      ])
        cylinder(d = hole_d, h = t + 0.3);

  // Red ticks = 4 mm from yellow PCB edge to hole centre (match Exterior-Size)
  color([1, 0.2, 0.2])
    for (left = [true, false]) {
      hx = left ? hole_inset_x : panel_w - hole_inset_x;
      ex = left ? pcb_x : pcb_x + panel_pcb_w;
      translate([min(hx, ex), pcb_y - tab_gap, t + 0.05])
        cube([side_gap, tab_gap, 0.12]);
      translate([min(hx, ex), pcb_y + panel_lcm_h, t + 0.05])
        cube([side_gap, tab_gap, 0.12]);
    }
  translate([pcb_x - tab_gap, hole_inset_y, t + 0.05])
    cube([tab_gap, side_gap, 0.12]);
  translate([pcb_x + panel_pcb_w, hole_inset_y, t + 0.05])
    cube([tab_gap, side_gap, 0.12]);
  translate([pcb_x - tab_gap, panel_h - hole_inset_y - side_gap, t + 0.05])
    cube([tab_gap, side_gap, 0.12]);
  translate([pcb_x + panel_pcb_w, panel_h - hole_inset_y - side_gap, t + 0.05])
    cube([tab_gap, side_gap, 0.12]);
}

module assembly() {
  color([0.25, 0.25, 0.28]) one_piece_case();
  if (show_ghost_panel)
    ghost_panel();
  else if (show_pcb_outline)
    pcb_outline_on_roof();
}

if (part == "case")
  one_piece_case();
else if (part == "hole_gauge")
  hole_gauge();
else if (part == "fit_check")
  fit_check();
else
  assembly();
