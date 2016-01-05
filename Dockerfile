FROM ubuntu:trusty
MAINTAINER Di Wu <diwu@yelp.com>

# Ubuntu packages
RUN apt-get update && \
  apt-get install -y python-pip python-dev curl build-essential pwgen libffi-dev sudo git-core wget \
  # Postgres client
  libpq-dev \
  # Additional packages required for data sources:
  libssl-dev libmysqlclient-dev

# Users creation
RUN useradd --system --comment " " --create-home redash

# rediect pip to china mirror
RUN mkdir ~/.pip
RUN rm -f ~/.pip/pip.conf 
RUN echo "[global]">> ~/.pip/pip.conf 
RUN echo "index-url = http://pypi.douban.com/simple" >> ~/.pip/pip.conf  

# Pip requirements for all data source types
RUN pip install  -i http://pypi.douban.com/simple/ -U setuptools && \
  pip install  -i http://pypi.douban.com/simple/ supervisor==3.1.2

COPY . /opt/redash/current

# Setting working directory
WORKDIR /opt/redash/current

# Install project specific dependencies
RUN pip install -r requirements_all_ds.txt && \
  pip install -r requirements.txt

# Setup supervisord
RUN mkdir -p /opt/redash/supervisord && \
    mkdir -p /opt/redash/logs && \
    cp /opt/redash/current/setup/docker/supervisord/supervisord.conf /opt/redash/supervisord/supervisord.conf

# Fix permissions
RUN chown -R redash /opt/redash

# Expose ports
EXPOSE 5000
EXPOSE 9001

# Startup script
CMD ["supervisord", "-c", "/opt/redash/supervisord/supervisord.conf"]
