import { dataFilePath } from "./BuildVersioning.mjs";
import fs from "fs";

export function updateDownloadCounter(projectName, branch, buildId) {
    const data = loadData();
    if (data && data[projectName] && data[projectName][branch] && data[projectName][branch].builds[buildId]) {
        data[projectName][branch].builds[buildId].downloads = data[projectName][branch].builds[buildId].downloads ? data[projectName][branch].builds[buildId].downloads + 1 : 1;
        saveData(data);
    }
}

function loadData() {
    if (fs.existsSync(dataFilePath)) {
        const jsonData = fs.readFileSync(dataFilePath, "utf8");
        return JSON.parse(jsonData);
    }
    return null;
}

function saveData(data) {
    if (data) {
        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(dataFilePath, jsonData, "utf8");
    }
}