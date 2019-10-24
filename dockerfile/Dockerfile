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

# # 베이스가 될 이미지. 로컬에 받아놓은 이미지를 먼저 찾고 없으면 리모트서버에서 받아온다.
FROM node:10

# 앱 디렉터리 생성
WORKDIR /app

# 앱 의존성 설치
# 가능한 경우(npm@5+) package.json과 package-lock.json을 모두 복사하기 위해
# 와일드카드를 사용
COPY ../package*.json /app

RUN npm install
# 프로덕션을 위한 코드를 빌드하는 경우
# RUN npm ci --only=production

# 앱 소스 추가
COPY . /app

EXPOSE 8080
CMD [ "node", "server.js" ]