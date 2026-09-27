FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
ENV NEXT_STATIC_EXPORT=1 NEXT_PUBLIC_API_URL=
RUN npm run build

FROM python:3.11-slim
WORKDIR /srv
COPY --from=build /app/out ./frontend/out
COPY backend/ ./backend/
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
ENV SPECTRA_DATA_DIR=/srv/backend/data SPECTRA_UPLOAD_DIR=/srv/backend/data/uploads SPECTRA_REPORT_DIR=/srv/backend/data/reports
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/srv"]
