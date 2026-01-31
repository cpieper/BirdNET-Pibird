# BirdNET-Pibird 🐦

[![Listen Live](https://img.shields.io/badge/🎧_Listen_Live-durm.pibirds.org-4CAF50?style=for-the-badge)](https://durm.pibirds.org)
[![Powered by](https://img.shields.io/badge/Powered_by-Raspberry_Pi_3B+-C51A4A?style=for-the-badge&logo=raspberrypi)](https://www.raspberrypi.com/)
[![Location](https://img.shields.io/badge/📍-Durham,_NC-blue?style=for-the-badge)](https://durm.pibirds.org)

> *A tiny computer in my backyard is eavesdropping on birds. 24/7. They have no idea.*

Real-time acoustic bird classification running on a Raspberry Pi 3B+, listening to the birds of Durham, North Carolina.

<p align="center">
  <img src="https://user-images.githubusercontent.com/60325264/140656397-bf76bad4-f110-467c-897d-992ff0f96476.png" alt="BirdNET-Pi" width="200"/>
</p>

---

## What's This?

This is my personal fork of [BirdNET-Pi](https://github.com/Nachtzuster/BirdNET-Pi), optimized for **mobile-friendly viewing** and performance on older Pi hardware. A humble Raspberry Pi 3B+ sits in Durham, NC, constantly listening, identifying, and cataloguing every chirp, tweet, and warble it picks up.

**Want to see what's singing right now?** → **[durm.pibirds.org](https://durm.pibirds.org)**

## What Makes This Fork Special

| Feature | What it means for you |
|---------|----------------------|
| 📱 **Mobile-Friendly UI** | Check your birds from anywhere—the web interface actually works on phones |
| 📊 **Full Species Charts** | Daily charts show *all* species, not just the top 10 |
| 👆 **Swipe Navigation** | Swipe through daily charts on touch devices |
| ⚡ **Faster Analysis** | Consolidated analysis pipeline + TFLite 2.17.1 = snappier detection |
| 💾 **Backup & Restore** | Never lose your bird data again |
| 🐧 **Bookworm + Trixie** | Modern Debian support |

<details>
<summary><b>Full changelog from upstream</b></summary>

- Reworked analysis to consolidate analysis/server/extraction (more robust, especially with large recording sets)
- Daily plot daemon (`daily_plot.py`) avoids expensive startup overhead
- Experimental tmpfs support for transient files  
- Bumped Apprise version for 90+ notification platforms
- Swipe events on Daily Charts (thanks [@croisez](https://github.com/croisez))
- Support for Species range model V2.4 - V2
- Lots of fixes & cleanups

</details>

---

## Quick Start

```bash
curl -s https://raw.githubusercontent.com/Nachtzuster/BirdNET-Pi/main/newinstaller.sh | bash
```

Then point it at this fork:

```bash
git remote set-url origin https://github.com/cpieper/BirdNET-Pibird.git
git fetch origin && git reset --hard origin/main
./scripts/update_birdnet.sh
```

**Requirements:** Raspberry Pi (5/4B/400/3B+/0W2) • 64-bit RaspiOS • USB microphone

---

## Standing on the Shoulders of Giants

This project wouldn't exist without:

| Project | Credit |
|---------|--------|
| [BirdNET-Analyzer](https://github.com/kahst/BirdNET-Analyzer) | [@kahst](https://github.com/kahst) — the ML magic behind bird identification |
| [BirdNET-Pi](https://github.com/mcguirepr89/BirdNET-Pi) | [@mcguirepr89](https://github.com/mcguirepr89) — the original Pi implementation |
| [BirdNET-Pi (Nachtzuster)](https://github.com/Nachtzuster/BirdNET-Pi) | [@Nachtzuster](https://github.com/Nachtzuster) — the fork this builds upon |
| [TFLite Binaries](https://github.com/PINTO0309/TensorflowLite-bin) | [@PINTO0309](https://github.com/PINTO0309) — pre-built TensorFlow Lite |

<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/"><img src="https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg" alt="License"></a>

---

## Learn More

📚 **Full documentation, troubleshooting, and community discussions live upstream:**

- [Installation Guide](https://github.com/mcguirepr89/BirdNET-Pi/wiki/Installation-Guide)
- [Wiki](https://github.com/mcguirepr89/BirdNET-Pi/wiki)
- [Discussions](https://github.com/mcguirepr89/BirdNET-Pi/discussions)
- [BirdWeather](https://app.birdweather.com) — share your birds with the world

---

<p align="center">
  <sub>Icon by <a href="https://www.freepik.com">Freepik</a> from <a href="https://www.flaticon.com/">Flaticon</a></sub>
</p>

<p align="center">
  <i>Currently listening in Durham, NC...</i> 🎤🐦
</p>
