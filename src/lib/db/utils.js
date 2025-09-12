"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHashedPassword = generateHashedPassword;
exports.generateDummyPassword = generateDummyPassword;
const ai_1 = require("ai");
const bcrypt_ts_1 = require("bcrypt-ts");
function generateHashedPassword(password) {
    const salt = (0, bcrypt_ts_1.genSaltSync)(10);
    const hash = (0, bcrypt_ts_1.hashSync)(password, salt);
    return hash;
}
function generateDummyPassword() {
    const password = (0, ai_1.generateId)();
    const hashedPassword = generateHashedPassword(password);
    return hashedPassword;
}
