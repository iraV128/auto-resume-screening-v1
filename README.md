auto-resume-screening/
│
├── README.md
├── .gitignore
├── LICENSE
│
├── docs/
│   ├── PROJECT_OVERVIEW.md
│   ├── API_DOCUMENTATION.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── QA_TEST_SCRIPT.md
│   ├── DEMO_SCRIPT.md
│   └── SCREENSHOTS/
│
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   │
│   ├── db/
│   │   ├── database.js
│   │   └── data.sqlite        (runtime – do NOT commit)
│   │
│   ├── routes/
│   │   ├── jobs.routes.js
│   │   ├── resumes.routes.js
│   │   └── analysis.routes.js
│   │
│   ├── services/
│   │   └── rank.service.js
│   │
│   ├── python/
│   │   ├── score_tfidf.py
│   │   └── requirements.txt
│   │
│   ├── uploads/              (runtime – do NOT commit)
│   │
│   └── node_modules/         (ignored)
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   │
│   ├── public/
│   │
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── JobForm.jsx
│       │   ├── ResumeUpload.jsx
│       │   └── RankingList.jsx
│       └── services/
│           └── api.js
│
└── .github/
    └── workflows/
        └── ci.yml
