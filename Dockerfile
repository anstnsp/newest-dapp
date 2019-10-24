# # 베이스가 될 이미지. 로컬에 받아놓은 이미지를 먼저 찾고 없으면 리모트서버에서 받아온다.
# FROM ubuntu

# # 정보 입력
# LABEL maintainer "ho1234c@gmail.com"

# # 명령어 실행
# RUN apt-get update
# RUN apt-get install nginx

# # 파일 복사
# ADD 복사할파일 복사될위치
# ADD . /app

# # 열어줄 포트
# EXPOSE 8080

# # 빌드 컨텍스트에 사용할 환경변수 설정
# ENV NODE_ENV production

# # 워킹디렉토리 설정
# WORKDIR /app

# # 마운트할 볼륨의 위치를 지정
# VOLUME ["/data"]

# # 컨테이너가 실행되었을 때 실행할 명령어
# CMD ["npm", "start"]

# # 베이스가 될 이미지. 로컬에 받아놓은 이미지를 먼저 찾고 없으면 리모트서버에서 받아온다.
# # 베이스가 될 이미지. 로컬에 받아놓은 이미지를 먼저 찾고 없으면 리모트서버에서 받아온다.
# FROM ubuntu

# # 정보 입력
# LABEL maintainer "ho1234c@gmail.com"

# # 명령어 실행
# RUN apt-get update
# RUN apt-get install nginx

# # 파일 복사
# ADD 복사할파일 복사될위치
# ADD . /app

# # 열어줄 포트
# EXPOSE 8080

# # 빌드 컨텍스트에 사용할 환경변수 설정
# ENV NODE_ENV production

# # 워킹디렉토리 설정
# WORKDIR /app

# # 마운트할 볼륨의 위치를 지정
# VOLUME ["/data"]

# # 컨테이너가 실행되었을 때 실행할 명령어
# CMD ["npm", "start"]
##아래가 최신 8월22일까지 쓴거 

# 베이스가 될 이미지. 로컬에 받아놓은 이미지를 먼저 찾고 없으면 리모트서버에서 받아온다.
# FROM node:8

# #Dockerfile 을 생성/관리하는 사람
# MAINTAINER MunSu Kim <anstnsp@naver.com>
# # /app 디렉토리 생성
# RUN mkdir -p /app
# # /app 디렉토리를 WORKDIR 로 설정
# WORKDIR /app
# # 현재 Dockerfile 있는 경로의 모든 파일을 /app 에 복사
# ADD . /app
# # npm install 을 실행
# RUN npm install

# #환경변수 NODE_ENV 의 값을 development 로 설정
# ENV NODE_ENV production

# #가상 머신에 오픈할 포트
# EXPOSE 8888

# #컨테이너에서 실행될 명령을 지정
# CMD ["npm", "start"]





FROM node:8

#Dockerfile 을 생성/관리하는 사람
MAINTAINER MunSu Kim <anstnsp@naver.com>
# /app 디렉토리 생성


RUN npm install pm2 -g && pm2 install pm2-logrotate && pm2 install pm2-intercom

# /app 디렉토리를 WORKDIR 로 설정
WORKDIR /opt/DApp
# 현재 Dockerfile 있는 경로의 모든 파일을 /app 에 복사
#ADD . /DApp

#환경변수 NODE_ENV 의 값을 development 로 설정
# ENV NODE_ENV production

#가상 머신에 오픈할 포트
EXPOSE 8888

#컨테이너에서 실행될 명령을 지정
CMD ["pm2-runtime", "app.js"]