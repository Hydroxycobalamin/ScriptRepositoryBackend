import cors from "cors";
import express from "express";
import crypto from "crypto";
import fs from "fs";

import { GenerateBuild, GetBranchName } from "./functions/BuildVersioning.mjs";
import { token } from "./config/config.mjs";

const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

app.post("/build", async (req, res) => {
    try {
        const expectedSignature = req.headers["x-hub-signature-256"];
        const calculatedSignature = `sha256=${crypto.createHmac("sha256", token).update(JSON.stringify(req.body)).digest("hex")}`;

        if (expectedSignature === calculatedSignature) {
            const url = req.body.repository.html_url;
            await GenerateBuild(url, req.body.ref);
            res.status(200).json({ message: "Build successful" });
        } else {
            console.log("Signature is invalid");
            res.status(401).json({ error: "Invalid signature" });
        }
    } catch (error) {
        console.error("Error while reloading:", error);
        res.status(500).json({ error: "Reload failed" });
    }
});

app.get("/download/:projectName/:branch/:id", function (req, res) {
    const projectName = req.params.projectName;
    const branch = req.params.branch;
    const buildId = req.params.id;
    const fileName = `${projectName}-${GetBranchName(branch)}-${buildId}.zip`;
    const file = `./builds/${projectName}/${branch}/${fileName}`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.download(file); // Set disposition and send it.
});

app.get("/data", (req, res) => {
    if (fs.existsSync("./builds/data.json")) {
        const json = fs.readFileSync("./builds/data.json", "utf8");
        res.json({ returnMessage: JSON.parse(json) })
    }
});
