const fs = require("fs")
const { program } = require('commander')

program
    .version("0.0.1")
    .option("")
function isObject(exp) {
    return Object.prototype.toString.call(exp) == '[object Object]'
}

/**
 * 
 * @param {string[]} pathNodeArr 
 * @param {*} target 
 */
function indexOfInvalidPathNode(pathNodeArr, target, pathNodeArrIndex = 0) {
    if (pathNodeArrIndex >= pathNodeArr.length) return -1;
    var key = pathNodeArr[pathNodeArrIndex]
    var value = target[key]
    if (value == undefined) {
        return pathNodeArrIndex;
    } else {
        return indexOfInvalidPathNode(pathNodeArr, value, ++pathNodeArrIndex)
    }
}

function setValue(target, pathNodeArr, value) {
    const lastKey = pathNodeArr[pathNodeArr.length - 1]
    for (let i = 0; i < pathNodeArr.length - 1; i++) {
        target = target[pathNodeArr[i]]
    }
    target[lastKey] = value
}

function deepTraveral(json, cb, nodeArr = []) {
    for (let key in json) {
        const value = json[key]
        nodeArr.push(key)
        if (isObject(value)) {
            deepTraveral(value, cb, nodeArr)
        } else {
            cb(value, nodeArr)
        }
        nodeArr.pop()
    }
}

async function main() {
    try {
        const targetJsonFilePath = "server_config.json"
        // await child_process.execSync("git reset " + "server_config.json", {
        //     encoding: "utf-8",
        //     stdio: "pipe"
        // })
        if (!fs.existsSync(targetJsonFilePath)) {
            throw ("server_config.json未找到对应文件！")
        }
        const mergeJsonFilePath = "server_config.merge.json"
        if (!fs.existsSync(mergeJsonFilePath)) {
            throw ("server_config.merge.json未找到对应文件！")
        }

        let targetJson;
        try {
            targetJson = JSON.parse(fs.readFileSync(targetJsonFilePath, { encoding: 'utf-8' }));
        } catch (e) {
            throw '解析server_config.json文件时报错：' + e.message
        }
        let mergeJson;
        try {
            mergeJson = JSON.parse(fs.readFileSync(mergeJsonFilePath, { encoding: 'utf-8' }));
        } catch (e) {
            throw '解析server_config.merge.json文件时报错：' + e.message
        }
        const $prop = mergeJson["$prop"] || {}
        delete mergeJson["$prop"]
        deepTraveral(mergeJson, (value, nodeArr) => {
            const idx = indexOfInvalidPathNode(nodeArr, targetJson)
            if (idx >= 0) {
                console.warn(`warning: 属性"${nodeArr.join('.')}"找不到，原因是${nodeArr[idx]}找不到，跳过。`)
            } else {
                console.log("正在替换: " + nodeArr.join('.'))
                setValue(targetJson, nodeArr, value)
            }
        })

        const targetResultStr = JSON.stringify(targetJson, function (key, value) {
            if (value[0] == "$") {
                return $prop[value.slice(1)]
            }
            return value;
        }, 2);
        fs.writeFileSync(targetJsonFilePath, targetResultStr)
    } catch (e) {
        console.error(e.stderr || e)
    }
}

main().then(() => {
    console.log('Press any key to exit');

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
})

