FROM node:20

WORKDIR /app

# copy ONLY package files first
COPY package.json package-lock.json ./

# force clean install for Linux
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]