FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends redis-server \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY api/requirements.txt /app/api/requirements.txt
RUN pip install --upgrade pip \
    && pip install -r /app/api/requirements.txt

COPY . /app

WORKDIR /app/api
RUN chmod +x /app/api/deployment.sh

EXPOSE 8000

CMD ["/app/api/deployment.sh"]
