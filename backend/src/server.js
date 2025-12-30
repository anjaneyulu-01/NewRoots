import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Fix for ES modules (__dirname replacement)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicit path to backend/.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });


import app from "./app.js";

// Render requires trust proxy for correct client IP and secure cookies
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`NewRoots backend listening on port ${PORT}`);
});
