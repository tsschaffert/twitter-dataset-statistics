import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
const commandLineArgs = require('command-line-args');

const optionDefinitions = [
    { name: 'input', type: String, multiple: false, defaultOption: true }
];

const fileRegex = /^([0-9]+)\.arff$/;

async function main(options) {
    if (options.input === undefined) {
        console.error("Input folder is needed.");
        process.exit(1);
        return;
    }

    await processFolder(options.input);
}

async function processFolder(inputFolder: string) {
    let files = fs.readdirSync(inputFolder);
    
    for (let file of files) {
        let match = fileRegex.exec(file);

        if (match && match.length > 1) {
            const userid = match[1];

            const filename = path.join(inputFolder, file);

            // Test if dataset has enough tweets first
            let analysis = await analyseDataset(filename, userid);

            console.log(`${analysis.userid};${analysis.instances};${analysis.attributes}`);
        }
    }
}

async function analyseDataset(filename: string, userid: string): Promise<{ userid: string, instances: number, attributes: number }> {
    return new Promise<{ userid: string, instances: number, attributes: number }>((resolve, reject) => {
        let numberAttributes = 0;
        let numberInstances = 0;
        let inDataArea = false;
        const rl = readline.createInterface({
            input: fs.createReadStream(filename)
        });
    
        rl.on('line', (line: string) => {
            if (!inDataArea && line.trim().indexOf("@attribute") === 0) {
                numberAttributes++;
            } else {
                if (inDataArea) {
                    if (line.trim() !== "") {
                        numberInstances++;
                    }
                } else {
                    if (line.trim().indexOf("@data") === 0) {
                        inDataArea = true;
                    }
                }
            }
        });

        rl.on('close', () => {
            resolve({
                userid: userid,
                instances: numberInstances,
                attributes: numberAttributes
            });
        });
    });
    
}

main(commandLineArgs(optionDefinitions))