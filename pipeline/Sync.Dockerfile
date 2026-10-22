FROM python:3.12-slim

WORKDIR /backend

RUN apt-get update && apt-get install -y gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-sync.txt .
RUN pip install --no-cache-dir -r requirements-sync.txt

ENV PYTHONPATH=/backend

CMD ["python", "/pipeline/scripts/sync_scheduler.py"]
