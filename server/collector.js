// collector.js - quick acceptor for demo
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
app.use(bodyParser.json({ limit: "5mb" }));
app.use(cors());

app.post("/collect", (req, res) => {
  const { apiKey, events } = req.body || {};
  console.log("--- RECEIVED BATCH ---");
  console.log("apiKey:", apiKey);
  if (Array.isArray(events)) {
    events.forEach((ev) => {
      console.log(
        `${ev.timestamp} | ${ev.event} | user:${
          ev.distinct_id || "anonymous"
        } | session:${ev.session_id} | url:${ev.url}`
      );
      console.log(" props:", ev.properties);
    });
  } else {
    console.log("payload", req.body);
  }
  console.log("--- END BATCH ---\n");
  res.json({ ok: true });
});

app.listen(4000, () =>
  console.log("Collector listening on http://localhost:4000")
);
