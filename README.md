# Echoes AI | Hackathon Monorepo

Echoes AI is a dual-track hackathon project containing:

• **Closed Track:** AI-powered forensic investigation tool  
• **Open Track:** AI skin health diagnostic assistant

The repository is organized as a **monorepo** containing multiple frontends, backends, and analysis services.

---

# Project Overview

## Closed Track: Echoes Forensics

Echoes Forensics is an **AI-assisted forensic investigation platform** designed to help identify suspects using **fingerprint analysis and DNA matching**.

Investigators upload:

• Crime scene fingerprint  
• Suspect fingerprint database  
• Crime scene DNA sequence  
• Suspect DNA database

The platform analyzes the evidence and generates a **ranked suspect analysis report**.

### Key Capabilities

**Fingerprint Matching**

Computer vision techniques extract fingerprint keypoints and compare them against a suspect fingerprint database to determine the closest match.

**DNA Sequence Matching**

DNA samples are analyzed using sequence alignment techniques to measure similarity between the crime scene sample and suspect DNA records.

**Unified Investigation Dashboard**

The results are displayed in an investigative dashboard showing:

• Best fingerprint match  
• DNA similarity scores  
• Ranked suspect likelihood  
• Visual fingerprint comparison output  

This demonstrates how **AI, computer vision, and bioinformatics** can assist forensic investigations.

---

## Open Track: AI Skin Health Analyzer

The Open Track project is an **AI-powered skin diagnostic assistant**.

Users can:

1. Upload a **photo of their face**
2. Select **specific facial zones**
3. Enter **skin symptoms or concerns**

The AI analyzes the image and symptoms to generate:

• Skin condition analysis  
• Recommended skincare actions  
• Preventative suggestions  
• Product recommendations with links

The goal is to create an **accessible AI skin health assistant** that helps users better understand and manage their skincare.

---

# Repository Structure

```
.
├── apps
│   ├── frontend           # Closed track frontend (NextJS)
│   ├── backend            # Closed track backend (Hono + Node)
│   ├── frontend-open      # Open track frontend (React)
│   └── backend-open       # Open track backend (Python)
│
├── services               # Closed track Python analysis services
│
└── README.md
```

---

# Tech Stack

## Closed Track

Frontend  
• Next.js  
• React  
• TypeScript  

Backend  
• Node.js  
• TypeScript  
• Hono  

Services  
• Python  
• Computer Vision (Fingerprint Matching)  
• DNA Sequence Analysis  
• Gemini AI  

---

## Open Track

Frontend  
• React  

Backend  
• Python  

---

# Demo Videos

## Closed Track Demo

Insert video link here

---

## Open Track Demo

Insert video link here

---

# Bonus Feature (Closed Track)

Our bonus feature demonstrates how **DNA evidence can be transformed into visual investigative insight**.

After analyzing the DNA sequence, the system uses AI to **generate a potential suspect image representation** based on predicted characteristics.

This concept explores how genomic analysis could assist investigators in visualizing potential suspects.

### Bonus Feature Demo

Insert video link here

---

# Setup Instructions

## 1. Clone the Repository

```bash
git clone https://github.com/sklyerx/mlh.git
cd mlh
```

---

# Running the Closed Track

## Start Analysis Services

Navigate to the services directory.

```bash
cd services
```

Install dependencies.

```bash
pip install -r requirements.txt
```

Run the analysis services.

Example:

```bash
python Fingerprint_analysis.py
python dna_analysis.py
```

---

## Start Closed Track Backend

```bash
cd apps/backend
```

Install dependencies.

```bash
pnpm install
```

Start the server.

```bash
pnpm dev
```

make sure to also update the .env with the values displayed in the `.env.example` file

---

## Start Closed Track Frontend

```bash
cd apps/frontend
```

Install dependencies.

```bash
pnpm install
```

Run the development server.

```bash
pnpm dev
```

Open the application:

```
http://localhost:3000
```

---

# Running the Open Track

## Start Open Track Backend

```bash
cd apps/backend-open
```

Install dependencies.

```bash
pip install -r requirements.txt
```

Run the backend.

```bash
python main.py
```

---

## Start Open Track Frontend

```bash
cd apps/frontend-open
```

Install dependencies.

```bash
npm install
```

Run the development server.

```bash
npm start
```

---

# Why This Matters

Echoes AI explores how modern technologies such as **AI, computer vision, and bioinformatics** can be combined to solve real-world investigative and healthcare problems.

The project demonstrates how AI systems can assist in:

• Criminal investigation workflows  
• Evidence analysis  
• Personal healthcare insights  

---

# Team

Built during the hackathon using a **monorepo architecture** to rapidly develop and integrate multiple services, APIs, and frontends.
