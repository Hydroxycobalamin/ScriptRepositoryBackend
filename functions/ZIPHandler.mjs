import path from "path";
import AdmZip from "adm-zip";
import axios from "axios";
import fs from "fs";

import { createDirectory } from "./BuildVersioning.mjs";

async function DownloadZIP(zipUrl, folderPath, projectName, buildNumber) {
    try {
        const response = await axios({
            method: "GET",
            url: zipUrl,
            responseType: "stream",
        });
        createDirectory(folderPath);

        const zipFilePath = path.join(folderPath, `${projectName}_${buildNumber}.zip`);

        const writer = fs.createWriteStream(zipFilePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on("finish", () => {
                resolve(zipFilePath);
            });
            writer.on("error", reject);
        });
    } catch (error) {
        console.error("Fehler beim Herunterladen der ZIP-Datei:", error);
        throw error;
    }
}

function ExtractZIP(zipFilePath) {
    const extractPath = path.dirname(zipFilePath);
    try {
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(extractPath, true);
        console.log("ZIP-Datei erfolgreich entpackt.");
    } catch (error) {
        console.error("Fehler beim Entpacken der ZIP-Datei:", error);
        throw error;
    }
    return extractPath;
}

function ZipFiles(files, zipFilePath) {
    try {
        const zip = new AdmZip();
        files.forEach((file) => {
            const fileName = path.basename(file);
            const excludedFolderPath = GetExcludedPath(file);
            const relativePath = path.relative(excludedFolderPath, path.dirname(file));
            const modifiedPath = path.join(relativePath, fileName);
            const fileContent = fs.readFileSync(file);
            zip.addFile(modifiedPath, fileContent);
        });
        const zipDirectory = path.dirname(zipFilePath);
        if (!fs.existsSync(zipDirectory)) {
            fs.mkdirSync(zipDirectory, { recursive: true });
        }
        zip.writeZip(zipFilePath);
        console.log("Files sucessfully zipped.");
    } catch (error) {
        console.error("Error while zipping files: ", error);
        throw error;
    }
}

function GetExcludedPath(filePath) {
    const remainingPath = `${filePath.split(path.sep).slice(0, 3).join(path.sep)}`
    return remainingPath;
}

function RemoveUnzippedFolder(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const currentPath = path.join(folderPath, file);
            if (fs.statSync(currentPath).isDirectory()) {
                RemoveUnzippedFolder(currentPath);
            } else {
                fs.unlinkSync(currentPath);
            }
        });

        fs.rmdirSync(folderPath);
        //console.log(`Folder ${folderPath} sucessfully deleted.`);
    } else {
        console.log(`Error while deleting folder: The path ${folderPath} does not exist.`);
    }
}

export { DownloadZIP, ExtractZIP, ZipFiles, RemoveUnzippedFolder };
