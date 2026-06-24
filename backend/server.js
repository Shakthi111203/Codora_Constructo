import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import generateRoute from "./routes/generate.js";
import analyzeRoute  from "./routes/analyze.js";   // ✅ NEW
import inferDomain from "./routes/infer-domain.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));          // ✅ fixes 413 for screenshots
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api/generate", generateRoute);
app.use("/api/analyze",  analyzeRoute);            // ✅ fixes 404
app.use("/api/infer-domain", inferDomain);

console.log("KEY:", process.env.GROQ_API_KEY);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});