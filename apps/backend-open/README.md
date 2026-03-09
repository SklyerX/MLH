# Crystal — Backend

AI-powered skin analysis API. Accepts a face photo, analyzes skin conditions by zone using Gemini Vision, and returns findings with product recommendations.

## Requirements

- Python **3.11** (other versions may not work)
- A Gemini API key

## Setup

**1. Clone the repo and navigate to the backend:**
```bash
cd apps/backend-open
```

**2. Create and activate a virtual environment:**
```bash
python3.11 -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows
```

**3. Install dependencies:**
```bash
pip install -r requirements.txt
```

**4. Create a `.env` file in `apps/backend-open/`:**
```
GEMINI_API_KEY=your_api_key_here
```
Get your key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

**5. Run the server:**
```bash
python3 main.py
```

The API will be available at `http://127.0.0.1:8000`

## API Endpoint

`POST /analyze` — Upload a face image and receive skin analysis + product recommendations.
