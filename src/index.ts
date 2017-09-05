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
    
    console.log(`userid;instances;attributes;charAttributesPerCharacter;posAttributesPerWord`);

    for (let file of files) {
        let match = fileRegex.exec(file);

        if (match && match.length > 1) {
            const userid = match[1];

            const filename = path.join(inputFolder, file);

            // Test if dataset has enough tweets first
            let analysis = await analyseDataset(filename, userid);

            console.log(`${analysis.userid};${analysis.instances};${analysis.attributes};${analysis.charAttributes/analysis.averageCharacterCount/analysis.instances};${analysis.posAttributes/analysis.averageWordCount/analysis.instances}`);
        }
    }
}

async function analyseDataset(filename: string, userid: string) {
    return new Promise<{ userid: string, instances: number, attributes: number, charAttributes: number, posAttributes: number, averageCharacterCount: number, averageWordCount: number }>((resolve, reject) => {
        let numberAttributes = 0;
        let numberInstances = 0;
        let inDataArea = false;

        let charNgramAttributes = 0;
        let posNgramAttributes = 0;
        let tokenNgramAttributes = 0;

        let wordCountIndex = -1;
        let averageWordLengthIndex = -1;
        let classIndex = -1;

        let averageWordCount = 0;
        let averageCharacterCount = 0;
        let divideAverageBy = 0;

        const rl = readline.createInterface({
            input: fs.createReadStream(filename)
        });
    
        rl.on('line', (line: string) => {
            line = line.trim();
            if (!inDataArea && line.indexOf("@attribute") === 0) {
                let split = line.split(" ");
                let attributeName = split.length > 1 ? split[1].trim() : "";

                // Find index of certain attributes
                if (attributeName === "WordCount") {
                    wordCountIndex = numberAttributes;
                } else if (attributeName === "AverageWordLength") {
                    averageWordLengthIndex = numberAttributes;
                } else if (attributeName === "Class") {
                    classIndex = numberAttributes;
                }

                if (attributeName.indexOf("char") === 0) {
                    charNgramAttributes++;
                } else if (attributeName.indexOf("pos") === 0) {
                    posNgramAttributes++;
                }
                // TODO add token ngrams if relevant

                numberAttributes++;
            } else {
                if (inDataArea) {
                    if (line !== "") {
                        let attributeSplit = line.split(",");
                        let attributeResult = {
                            classValue: "",
                            wordCount: -1,
                            averageWordLength: -1,
                        };

                        for (let attributeEntry of attributeSplit) {
                            let split = attributeEntry.trim().split(" ");

                            let index = Number.parseInt(split[0]);
                            let value = split[1];

                            if (index === wordCountIndex) {
                                attributeResult.wordCount = Number.parseFloat(value);
                            } else if (index === averageWordLengthIndex) {
                                attributeResult.averageWordLength = Number.parseFloat(value);
                            } else if (index === classIndex) {
                                attributeResult.classValue = value;
                            }
                        }

                        if (attributeResult.classValue === "Mine") {
                            averageWordCount += attributeResult.wordCount;
                            averageCharacterCount += attributeResult.wordCount * attributeResult.averageWordLength;
                            divideAverageBy++;
                        }

                        numberInstances++;
                    }
                } else {
                    if (line.indexOf("@data") === 0) {
                        inDataArea = true;
                    }
                }
            }
        });

        rl.on('close', () => {
            averageCharacterCount /= divideAverageBy;
            averageWordCount /= divideAverageBy;

            resolve({
                userid: userid,
                instances: numberInstances,
                attributes: numberAttributes,
                charAttributes: charNgramAttributes,
                posAttributes: posNgramAttributes,
                averageCharacterCount: averageCharacterCount,
                averageWordCount: averageWordCount
            });
        });
    });
    
}

main(commandLineArgs(optionDefinitions))