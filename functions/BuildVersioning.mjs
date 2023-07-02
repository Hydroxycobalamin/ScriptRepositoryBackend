import fs from "fs";
import path from "path";
import {
  DownloadZIP,
  ExtractZIP,
  ZipFiles,
  RemoveUnzippedFolder,
} from "./ZIPHandler.mjs";
import { ReadFiles } from "./FileReader.mjs";
import { Project } from "../classes/build.mjs";

const buildDirectory = "./builds";
export const dataFilePath = path.join(buildDirectory, "data.json");

function createDirectory(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function GetProjectNameFromUrl(url) {
  return url.substring(url.lastIndexOf("/") + 1);
}

function GetBranchFromRef(ref) {
  return ref.substring(ref.lastIndexOf("/") + 1);
}

function GetProjectGitHubUrl(url, ref) {
  return url + "/archive/" + GetBranchFromRef(ref) + ".zip";
}

function GetBranchName(branch) {
  switch (branch) {
    case "main":
    case "master":
      return "REL";
    case "dev":
      return "DEV";
    default:
      return branch;
  }
}

async function GenerateBuild(url, data) {
  console.log("Start generating Build");
  try {
    const ref = data.ref;
    const commits = data.commits;
    const branch = GetBranchFromRef(ref);
    const projectName = GetProjectNameFromUrl(url);

    // Download the ZIP file
    const zipFilePath = await DownloadZIP(
      GetProjectGitHubUrl(url, ref),
      path.join(buildDirectory, projectName),
      projectName
    );
    console.log(zipFilePath);

    // Extract the ZIP file
    const extractPath = path.join(
      ExtractZIP(zipFilePath),
      `${projectName}-${branch}`
    );

    // Read the .buildexplorer file or use projectFolder as projectName
    let configData;
    const configFilePath = path.join(extractPath, ".buildexplorer");
    if (fs.existsSync(configFilePath)) {
      configData = await ReadConfigFile(configFilePath);
    } else {
      configData = { projects: [] };
    }

    // Process each project from the config file or use the main project
    const projects =
      configData.projects.length > 0
        ? configData.projects
        : [{ name: projectName, paths: [] }];

    // Build each project
    for (const project of projects) {
      const projectName = project.name;
      const projectPaths = project.paths;
      // Determine the project name
      const finalProjectName = projectName;

      // If no paths defined, build the entire project
      if (projectPaths.length === 0) {
        const buildNumber = GetBuildNumber(projectName);
        const files = ReadFiles(extractPath);
        const newZipFilePath = path.join(
          buildDirectory,
          projectName,
          branch,
          `${projectName}-${GetBranchName(branch)}-${buildNumber}.zip`
        );
        ZipFiles(files, newZipFilePath);

        const buildData = {
          download: newZipFilePath,
          commits: commits.map((commit) => ({
            url: commit.url,
            id: commit.id,
            message: commit.message,
          })),
          build: buildNumber,
        };

        // Create the build
        CreateBuild(finalProjectName, branch, buildNumber, buildData);
      } else {
        // Process each path for the project
        for (const buildPath of projectPaths) {
          console.log(projectPaths);
          const projectFolder = path.basename(buildPath);

          // Check if commits contain changes within the buildPath
          const hasChanges = commits.some((commit) => {
            // Check if any of the commit files have a path within the buildPath
            const paths = [
              ...commit.added,
              ...commit.removed,
              ...commit.modified,
            ]; // Combine paths from all three tabs
            return paths.some((filePath) => {
              return (
                filePath.startsWith(buildPath) ||
                filePath.startsWith(`/${buildPath}`)
              );
            });
          });

          // Create a separate build only if there are changes within the buildPath
          if (hasChanges) {
            const buildNumber = GetBuildNumber(projectFolder);
            const files = ReadFiles(path.join(extractPath, buildPath));
            const newZipFilePath = path.join(
              buildDirectory,
              projectName,
              branch,
              `${projectName}-${GetBranchName(branch)}-${buildNumber}.zip`
            );
            ZipFiles(files, newZipFilePath);

            // Create ObjectZipFiles
            const buildData = {
              download: newZipFilePath,
              commits: commits.map((commit) => ({
                url: commit.url,
                id: commit.id,
                message: commit.message,
              })),
              build: buildNumber,
            };

            // Create the build
            CreateBuild(finalProjectName, branch, buildNumber, buildData);
          }
        }
      }
    }

    // Cleanup
    RemoveUnzippedFolder(extractPath);
    fs.unlink(zipFilePath, (error) => {
      if (error) {
        console.error("Error while deleting ZIP File:", error);
      } else {
        console.log("ZIP File deleted sucessfully");
      }
    });
  } catch (error) {
    console.error(error);
  }
}

// Function to read the config file
function ReadConfigFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (error, data) => {
      if (error) {
        reject(
          `Error while reading the config file ${filePath}: ${error}`
        );
      } else {
        try {
          const configData = JSON.parse(data);
          resolve(configData);
        } catch (parseError) {
          reject(
            `Error while parsing the config file ${filePath}: ${parseError}`
          );
        }
      }
    });
  });
}

function CreateBuild(projectName, branch, buildNumber, buildData) {
  const project = new Project(projectName, branch);
  project.loadProject(projectName, branch);
  project.addBuild(buildNumber, buildData);
  project.saveToJson();
}

function GetBuildNumber(projectName) {
  const buildNumberFilePath = path.join(
    buildDirectory,
    `${projectName}_build_number.txt`
  );
  let buildNumber = 1;

  if (!fs.existsSync(buildDirectory)) {
    fs.mkdirSync(buildDirectory, { recursive: true });
  }

  if (fs.existsSync(buildNumberFilePath)) {
    const currentBuildNumber = fs.readFileSync(buildNumberFilePath, "utf8");
    buildNumber = parseInt(currentBuildNumber) + 1;
  }

  fs.writeFileSync(buildNumberFilePath, buildNumber.toString(), "utf8");
  return buildNumber;
}

export { GenerateBuild, GetBranchName, createDirectory, buildDirectory };