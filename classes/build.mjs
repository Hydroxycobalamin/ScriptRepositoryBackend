import fs from "fs";
import { dataFilePath } from "../functions/BuildVersioning.mjs";

export class Project {
    constructor(name, branch) {
        this.name = name;
        this.branch = branch;
        this.builds = {};
    }

    loadProject(projectName, branch) {
        if (fs.existsSync(dataFilePath)) {
            const jsonData = fs.readFileSync(dataFilePath, 'utf8');
            const data = JSON.parse(jsonData);
            if (data[projectName]?.hasOwnProperty(branch)) {
                this.builds = data[projectName][branch]?.builds;
            }
        }
    }

    addBuild(buildNumber, buildData) {
        this.builds[buildNumber] = buildData;
    }

    saveToJson() {
        let jsonData = {};
        if (fs.existsSync(dataFilePath)) {
            const existingData = fs.readFileSync(dataFilePath, 'utf8');
            jsonData = JSON.parse(existingData);
        }

        jsonData[this.name] = jsonData[this.name] || {};
        jsonData[this.name][this.branch] = {
            builds: this.builds
        };

        fs.writeFileSync(dataFilePath, JSON.stringify(jsonData, null, 2));
    }
}
