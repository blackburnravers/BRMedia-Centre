const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const projectRoot = process.cwd();
const profilesPath = path.join(projectRoot, "server", "data", "brmedia-profiles.json");
const login = String(process.argv[2] || "").trim().toLowerCase();
const newPassword = String(process.argv[3] || "");

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function makePassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return { salt, hash };
}

function makeResetHash(password) {
  return crypto.createHash("sha256").update(String(password || ""), "utf8").digest("hex");
}

if (!fs.existsSync(profilesPath)) {
  console.log("No profile file found at:");
  console.log(profilesPath);
  console.log("");
  console.log("Extract brmedia-profiles.json into server/data, then run this again.");
  process.exit(1);
}

const store = JSON.parse(fs.readFileSync(profilesPath, "utf8"));
const users = Array.isArray(store.users) ? store.users : [];

if (!login || !newPassword) {
  console.log("BRMedia profiles found:");
  users.forEach((user, index) => {
    console.log(`${index + 1}. username=${user.username || ""} email=${user.email || ""} displayName=${user.displayName || ""} hasPassword=${!!(user.passwordHash && user.passwordSalt)}`);
  });
  console.log("");
  console.log("To reset one profile password/PIN, run:");
  console.log('node tools/reset-profile-password.js "USERNAME_OR_EMAIL" "NEW_PASSWORD_OR_PIN"');
  process.exit(0);
}

if (newPassword.length < 4) {
  console.log("New password/PIN must be at least 4 characters.");
  process.exit(1);
}

const user = users.find((item) => (
  normalise(item.username) === login ||
  normalise(item.email) === login ||
  normalise(item.displayName) === login
));

if (!user) {
  console.log("No matching profile found for:");
  console.log(process.argv[2]);
  console.log("");
  console.log("Run this to list profiles:");
  console.log("node tools/reset-profile-password.js");
  process.exit(1);
}

const passwordData = makePassword(newPassword);
const now = Date.now();
user.passwordSalt = passwordData.salt;
user.passwordHash = passwordData.hash;
user.passwordResetHash = makeResetHash(newPassword);
user.passwordResetUpdatedAt = now;
user.passwordResetExpiresAt = now + (7 * 24 * 60 * 60 * 1000);
user.updatedAt = now;

store.users = users;
fs.writeFileSync(profilesPath, JSON.stringify(store, null, 2), "utf8");

console.log("BRMedia profile password/PIN reset successfully.");
console.log(`Profile: ${user.displayName || user.username || user.email}`);
console.log("Now restart BRMedia and login with the new password/PIN.");
console.log("A temporary recovery hash was also saved for 7 days, then removed automatically on successful login.");