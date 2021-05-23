const fs = require("fs");
const { program } = require("commander");

program
    .version("0.0.1")
    .option("-s, --src <path>", "the path of source file")
    .option("-d, --dst <path>", "the path of destintion file")
    .option("-m --merge [paths...]", "the path of file to merge")
    .option("-nw --nowait", "wait for press any button to exit");

program.parse(process.argv);

const opts = program.opts();
main(opts.src, opts.dst, opts.merge)
    .then(() => {
        if (!opts.nowait) {
            console.log("Process any key to continue...");
            process.stdin.setRawMode(true);
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

async function main(srcJsonFilePath, targetJsonFilePath, mergeJsonFilePath) {
    if (!targetJsonFilePath) {
        targetJsonFilePath = srcJsonFilePath
    }
    try {
        // await child_process.execSync("git reset " + "server_config.json", {
        //     encoding: "utf-8",
        //     stdio: "pipe"
        // })
        if (!fs.existsSync(srcJsonFilePath)) {
            throw `error: src path [${srcJsonFilePath}] cannot find!`;
        }
        if (!fs.existsSync(targetJsonFilePath)) {
            throw `error: dst path [${targetJsonFilePath}] cannot find!`;
        }
        if (!fs.existsSync(mergeJsonFilePath)) {
            throw `error: merge path [${mergeJsonFilePath}] cannot find!`;
        }

        let targetJson;
        try {
            targetJson = JSON.parse(
                fs.readFileSync(targetJsonFilePath, { encoding: "utf-8" })
            );
        } catch (e) {
            throw "解析server_config.json文件时报错：" + e.message;
        }
        let mergeJson;
        try {
            mergeJson = JSON.parse(
                fs.readFileSync(mergeJsonFilePath, { encoding: "utf-8" })
            );
        } catch (e) {
            throw "解析server_config.merge.json文件时报错：" + e.message;
        }
        const $prop = mergeJson["$prop"] || {};
        delete mergeJson["$prop"];
        deepTraveral(mergeJson, (value, nodeArr) => {
            const idx = indexOfInvalidPathNode(nodeArr, targetJson);
            if (idx >= 0) {
                console.warn(
                    `warning: 属性"${nodeArr.join(".")}"找不到，原因是${
                        nodeArr[idx]
                    }找不到，跳过。`
                );
            } else {
                console.log("正在替换: " + nodeArr.join("."));
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
        fs.writeFileSync(srcJsonFilePath, targetResultStr);
    } catch (e) {
        console.error(e.stderr || e);
    }
}
