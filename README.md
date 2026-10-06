# Muskan portfolio

Files
- index.html : page structure and text
- style.css  : colors, layout, fonts (colors are at the top, in :root)
- script.js  : certificate popup
- assets/    : photo, certificates, resume

Run locally
    python3 -m http.server 8000      # open http://localhost:8000

Run with Docker (nginx)
    docker build -t portfolio:v1 .
    docker run -d --name portfolio -p 8090:80 portfolio:v1   # open http://localhost:8090
