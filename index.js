const fs = require("fs");
const path = require("path");
const globby = require("globby");
const prompts = require("prompts");
require("colors");
const { program } = require("commander");

program
    .version("1.0.6")
    .option("-s, --src <path>", "the path of source file")
    .option("-d, --dst <path>", "the path of destintion file")
    .option("-m --merge <path>", "the path of file to merge")
    .option("-nw --nowait", "wait for press any button to exit")
    .option("-f --force", "replacement directly without checking for presence");

program.parse(process.argv);

const opts = program.opts();
main(opts.src, opts.dst, opts.merge, opts.force)
    .then(() => {
        if (!opts.nowait) {
            console.log("Process any key to continue...".gray);
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
            }
            process.stdin.resume();
            process.stdin.on("data", () => {
                process.exit(0);
            });
        }
    })
    .catch(console.error);

function isObject(exp) {
    return Object.prototype.toString.call(exp) == "[object Object]";
}

/**
 *
 * @param {string[]} pathNodeArr
 * @param {*} target
 */
function indexOfInvalidPathNode(pathNodeArr, target, pathNodeArrIndex = 0) {
    if (pathNodeArrIndex >= pathNodeArr.length) return -1;
    var key = pathNodeArr[pathNodeArrIndex];
    var value = target[key];
    if (value == undefined) {
        return pathNodeArrIndex;
    } else {
        return indexOfInvalidPathNode(pathNodeArr, value, ++pathNodeArrIndex);
    }
}

function setValue(target, pathNodeArr, value) {
    const lastKey = pathNodeArr[pathNodeArr.length - 1];
    for (let i = 0; i < pathNodeArr.length - 1; i++) {
        target = target[pathNodeArr[i]];
    }
    target[lastKey] = value;
}

function deepTraveral(json, cb, nodeArr = []) {
    for (let key in json) {
        const value = json[key];
        nodeArr.push(key);
        if (isObject(value)) {
            deepTraveral(value, cb, nodeArr);
        } else {
            cb(value, nodeArr);
        }
        nodeArr.pop();
    }
}

async function main(srcJsonFilePath, targetJsonFilePath, mergeJsonFilePath, isForce) {
    if (!mergeJsonFilePath) {
        const globbyPath =
            /* path.posix.join(__dirname, "*.merge.json"); */ "*.merge.json";
        const pathChoices = await globby(globbyPath);
        switch (pathChoices.length) {
            case 0:
                console.error(
                    "Cannot find merge json file" + "(*.merge.json)!".red
                );
                return;
            case 1:
                mergeJsonFilePath = pathChoices[0];
                break;
            default:
                const { selecgedMergeJsonPath } = await prompts({
                    type: "select",
                    name: "selecgedMergeJsonPath",
                    message: "Whick file you need to process?",
                    choices: pathChoices.map((c) => {
                        return {
                            title: c,
                            value: c,
                        };
                    }),
                });
                mergeJsonFilePath = selecgedMergeJsonPath;
                break;
        }
        mergeJsonFilePath = path.resolve(mergeJsonFilePath, ".");
        console.log("Find merge file: " + mergeJsonFilePath.green);
    }

    const mergeBasename = path.basename(mergeJsonFilePath);
    const pattern = /((.+))\.merge\.json/;
    const srcPrefix = pattern.exec(mergeBasename)[1];
    if (!srcJsonFilePath) {
        const toFindSrcPath = path.resolve(
            mergeJsonFilePath,
            "..",
            srcPrefix + ".json"
        );
        if (!fs.existsSync(toFindSrcPath)) {
            console.error("Cannot find src file: " + toFindSrcPath.red);
            return;
        }
        console.log("Find src file: " + toFindSrcPath.green);
        srcJsonFilePath = toFindSrcPath;
    }

    if (!targetJsonFilePath) {
        const { targetIsOverride } = await prompts({
            type: "confirm",
            name: "targetIsOverride",
            message: "The dst path is empty, can you confirm to override the source file?",
            initial: true,
        });
        if (targetIsOverride) {
            targetJsonFilePath = srcJsonFilePath;
        } else {
            targetJsonFilePath = path.resolve(
                mergeJsonFilePath,
                "..",
                srcPrefix + ".merged.json"
            );
        }
    }

    if (Object.keys(opts).length == 0) {
        isForce = (await prompts({
            type: "toggle",
            name: "isForce",
            message: "Need it enter the force mode?",
            initial: true,
            active: "force",
            inactive: "non-force"
        })).isForce;
    }

    try {
        // await child_process.execSync("git reset " + "server_config.json", {
        //     encoding: "utf-8",
        //     stdio: "pipe"
        // })
        if (!fs.existsSync(srcJsonFilePath)) {
            throw `error: src path [${srcJsonFilePath}] cannot find!`;
        }
        if (!fs.existsSync(mergeJsonFilePath)) {
            throw `error: merge path [${mergeJsonFilePath}] cannot find!`;
        }

        let targetJson;
        try {
            targetJson = JSON.parse(
                fs.readFileSync(srcJsonFilePath, { encoding: "utf-8" })
            );
        } catch (e) {
            throw "parse src file error：".red + e.message;
        }
        let mergeJson;
        try {
            mergeJson = JSON.parse(
                fs.readFileSync(mergeJsonFilePath, { encoding: "utf-8" })
            );
        } catch (e) {
            throw "parse merge file error: ".red + e.message;
        }
        const $prop = mergeJson["$prop"] || {};
        delete mergeJson["$prop"];
        deepTraveral(mergeJson, (value, nodeArr) => {
            const idx = indexOfInvalidPathNode(nodeArr, targetJson);
            if (idx >= 0) {
                if (isForce) {
                    console.warn(
                        `warning: attribute "${nodeArr.join(".")}" cannot find, block at ${
                            nodeArr[idx]
                        }, but still replace in force mode.`
                    )
                    setValue(targetJson, nodeArr, value);
                } else {
                    console.warn(
                        `warning: attribute "${nodeArr.join(".")}" cannot find, block at ${
                            nodeArr[idx]
                        }, ..skip.`
                    );
                }
            } else {
                console.log("Replace: " + nodeArr.join("."));
                setValue(targetJson, nodeArr, value);
            }
        });

        const targetResultStr = JSON.stringify(
            targetJson,
            function (key, value) {
                if (value[0] == "$") {
                    return $prop[value.slice(1)];
                }
                return value;
            },
            2
        );
        fs.writeFileSync(targetJsonFilePath, targetResultStr);
    } catch (e) {
        console.error(e.stderr || e);
    }
}
