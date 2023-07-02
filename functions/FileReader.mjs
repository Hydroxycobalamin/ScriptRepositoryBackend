import fs from "fs";
import path from "path";
import fg from "fast-glob";

function ReadFiles(directory) {
    // Get the main directory path.
    function GetMainDirectory(directory) {
        const parts = directory.split(path.sep);
        if (parts.length >= 3) {
            return parts.slice(0, 3).join(path.sep);
        }
        return directory;
    }

    // Check if a file should be excluded.
    function ShouldExclude(directory, excludes) {
        return fg.sync(excludes, { cwd: directory }).map((file) => path.join(directory, file));
    }

    // Read the content of the .excludes file.
    function ParseExcludesFile(fileContent) {
        return fileContent.split("\n").map(line => line.trim());
    }

    // Traverse the directory recursively and add files to the list.
    function ThroughDirectory(directory) {
        fs.readdirSync(directory).forEach((file) => {
            const absolute = path.join(directory, file);
            if (file === ".excludes") {
                excludes = ParseExcludesFile(fs.readFileSync(absolute, "utf-8"));
            }

            if (fs.statSync(absolute).isDirectory()) {
                ThroughDirectory(absolute);
            } else {
                files.push(absolute);
            }
        });
    }

    // Add only files (excluding directories) to the list.
    function ThroughDirectoryFiles(directory) {
        fs.readdirSync(directory).forEach((file) => {
            const absolute = path.join(directory, file);
            if (file === ".excludes") {
                excludes = ParseExcludesFile(fs.readFileSync(absolute, "utf-8"));
            }

            if (fs.statSync(absolute).isFile()) {
                files.push(absolute);
            }
        });
    }

    const files = [];
    const zipFiles = [];
    let excludes = [];

    ThroughDirectoryFiles(GetMainDirectory(directory));
    ThroughDirectory(directory);
    
    // If there are no excludes, return all the files.
    if (excludes.length === 0) {
        return files;
    }
    
    const excludedPaths = ShouldExclude(directory, excludes);
    
    files.forEach((file) => {
        if (!excludedPaths.includes(file) || !file.endsWith(".excludes")) {
            zipFiles.push(file);
        }
    });

    return zipFiles;
}

export { ReadFiles };
