import express from "express";

const app = express();
try {
  app.get("*all", (req, res) => {
    res.send("ok");
  });
  console.log("Success");
} catch (e) {
  console.error("Error:", e);
}
