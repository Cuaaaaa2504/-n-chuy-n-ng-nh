#!/usr/bin/env bash
set -e

npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/bcrypt @types/passport-jwt
npm install class-validator class-transformer
npm install @nestjs/typeorm typeorm
npm install @nestjs/mapped-types
