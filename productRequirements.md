# Samarth Medic: Tactical Telemedicine Platform
## Project Brief & Design Specification

### 1. Mission Overview
**Samarth Medic** is a high-fidelity tactical telemedicine ecosystem developed by IIT Jodhpur for the Indian Army. It is designed to provide advanced remote healthcare, real-time physiological monitoring, and AI-driven diagnostic support for soldiers in extreme terrains and combat environments.

### 2. Core User Personas
*   **Medical Officer (Command Center)**: Remote specialist providing advanced diagnostics and emergency consultations.
*   **Field Medic**: On-site responder initiating sensor initialization and triage.
*   **Soldier (Patient)**: The wearer of the bio-suit sensors, engaging in periodic health checks and telemedicine sessions.

### 3. Design System: Tactical Medical Interface
The platform utilizes the **Tactical Medical Interface** design system, defined by:
*   **Color Palette**: Light clinical theme. Primary: `#002d62` (Deep Navy), Secondary: `#00EEFC` (Cyan Glow). Surface: `#f7f9fb`.
*   **Typography**: **Sora** (Sans-serif) for high legibility under stress.
*   **Visual Language**: Futuristic HUD (Heads-Up Display) elements, glassmorphism, soft shadows, and rounded (8px) corners.
*   **Atmosphere**: Professional, advanced, calm, and highly secure.

### 4. Key Platform Modules & Screens
*   **Strategic Health Intelligence**: AI-powered dashboard for system-wide risk assessment, fatigue tracking, and predictive alerts (Heat Stroke, Altitude Sickness).
*   **Live Consultation & AR Diagnostic**: Immersive 3D human body interface with clickable organs for spatial diagnostic mapping and real-time video uplink.
*   **Organ-Specific Deep Dives**: Detailed heart/lung analysis including "Stetho-Sync" audio, live ECG waveforms, and AI cardiac insights.
*   **Sensor Initialization Hub**: Tactical 4-step sequence for bio-suit sensor pairing (ECG, SpO2, Temp) and STRAT-LINK encryption verification.
*   **Clinical Reporting**: Professional medical record generation with digital signatures and SHA-256 hash verification.

### 5. Technical Requirements
*   **Encryption**: AES-256 secure data tunneling for all biometric streams.
*   **AI Engine**: "Dharma AI" for predictive analytics, neural monitoring, and autonomous medical protocols.
*   **Connectivity**: Designed for low-latency SAT-NODE communication in remote areas.
*   **Device Support**: Optimized for high-density Desktop Command Centers with corresponding Mobile HUDs for field use.

### 6. Design Principles
*   **Fidelity**: Clinical-grade accuracy in data visualization.
*   **Urgency**: Clear visual hierarchy for emergency indicators and triage status.
*   **Trust**: High-transparency system status (encryption, sync, battery).
