#!/usr/bin/env bash
set -e

npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
npm install -D @types/bcrypt @types/passport-jwt
