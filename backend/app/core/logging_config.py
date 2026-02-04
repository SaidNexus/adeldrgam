import logging
import sys
import json
from datetime import datetime
from pythonjsonlogger import jsonlogger

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        log_record['timestamp'] = datetime.utcnow().isoformat()
        log_record['level'] = record.levelname
        log_record['logger'] = record.name

def setup_logging():
    """Configure structured JSON logging for production"""
    handler = logging.StreamHandler(sys.stdout)
    formatter = CustomJsonFormatter('%(timestamp)s %(level)s %(name)s %(message)s')
    handler.setFormatter(formatter)
    
    root_logger = logging.getLogger()
    root_logger.handlers = []
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)
    
    # Silence noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
