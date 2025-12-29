import dotenv from "dotenv";
dotenv.config();

// dotenv already loaded above; avoid noisy debug logs in production

import app from "./app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`NewRoots backend listening on port ${PORT}`);
});
