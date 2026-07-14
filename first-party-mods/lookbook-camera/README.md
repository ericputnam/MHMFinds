# MHM Lookbook Camera

First-party Sims 4 CAS camera mod — the first mod to change the CAS
camera's vertical angle. Born from Felister's lookbook feedback: the stock
CAS camera only rotates horizontally, so there's no overhead or low-angle
view for outfit shots.

Three variants, one zip (`dist/MHM-Lookbook-Camera-v1.0.zip`), install one
at a time:

| Variant | Pitch | Look |
|---|---|---|
| Top-Down | +55° | overhead editorial, flat-lay energy |
| Editorial | +22° | subtle catalog angle |
| Runway | −18° | low hero angle looking up |

## How it works

The CAS camera is data-driven: `Client_CASCameraTuning_Adult` SimData
(type `0x545AC67A`, group `0x005ADEC7`, instance `0x0A4C00B1FD306181`)
defines every camera preset with `Pitch`, `OrbitalRotation`, `Distance`,
`FOV`, and `CameraTarget`. EA ships all presets with pitch locked between
−7° and +10.5° — the "camera can't tilt" limitation is just config values.

Each variant is a ~1.2KB override extracted **live from the installed game**
(`build-lookbook-camera.js` reads SimulationPreload.package at build time)
with only the Pitch of camera regions **64 and 90** (the full-body views)
changed. Face and detail-edit views keep stock values, so Sim editing is
unaffected. The builder asserts byte-equivalence of everything except the
two pitch lines, and validates TGI + schema hash (`0x07A08880`) on
read-back.

## What is NOT possible (and why we don't ship it)

Free mouse-drag vertical orbit. CAS drag input is engine code mapped to
yaw only; no tuning adds an input axis, and Python script mods cannot reach
the client CAS camera. Anything claiming otherwise would be patching the
game executable. Fixed-angle variants are the honest ceiling — and in
practice, angle + existing horizontal orbit covers the lookbook use case.

## In-game QA log (2026-07-13, current patch)

- Probe A (+45° all 33 presets): override loads, pitch respected, no crash
- Probe B (+60° regions 64/90 only): full-body views tilt, face views
  stock — region mapping confirmed; angle persists across outfit categories
- Runway (−18°): negative pitch confirmed working (low angle hero shot)
- Zero lastException files across all sessions
- Region-90 hunt (2026-07-13, screen-driven): every reachable
  create-a-household surface (categories, body panel, styled looks + pose,
  tattoos, new-sim entrance, sim switch, walkstyle previews) uses region 64.
  Region 90 never fires there — suspected live-mode Plan Outfit/dresser
  camera (untested). Confirms fixed variants are the ceiling for CAS.
- Note: Top-Down ships +55° (mechanism tested at +45/+60); Editorial +22°
  is between tested values

## Known limitations / compatibility

- Adult Sims only in v1.0 (Child/Toddler/Infant camera tunings extracted
  and on file for a v1.1 if requested)
- Conflicts with any other CAS camera mod (same resource)
- As an override of an EA resource, re-verify after game patches:
  `node build-lookbook-camera.js` rebuilds from the installed game's
  current data, so a rebuild after a patch picks up EA's changes
  automatically while re-applying the pitch

## Rebuild

```bash
npm install @s4tk/models   # in this folder or reuse the trait pack's deps
node build-lookbook-camera.js
```
