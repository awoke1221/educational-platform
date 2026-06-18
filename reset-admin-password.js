const bcrypt = require("bcryptjs");

const password = "Admin@12345";
const saltRounds = 12;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error("Error:", err);
    process.exit(1);
  }
  console.log("Password hash:", hash);
  console.log("Use this hash to update the admin user in Supabase");
  process.exit(0);
});
